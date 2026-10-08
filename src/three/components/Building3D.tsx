import { activePanelAtom } from "../../store/atoms";
import { useMemo, useState, useCallback } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  activeToolAtom,
  chimneysAtom,
  getChimneyLocalPosition,
  interactionModeAtom,
  selectedChimneyIdAtom,
  selectedRectangleIdAtom,
  selectedTreeIdAtom,
  type Rectangle3D,
} from "../store/rectangleStore";
import { computeRoofSides } from "../helpers/roofSides";
import {
  selectedRoofSideAtom,
  roofPanelEditorAtom,
  type SelectedRoofSide,
} from "../store/solarPanelStore";
import { RoofSidePanels, useMatchingPanelConfigs } from "./SolarPanel3D";
import { selectedLotIdAtom } from "../store/lotStore";
import { generateId } from "../../utils/helpers";
import { useRoofBodyDrag } from "../hooks/useRoofBodyDrag";
import {
  computeRectCorners,
  createWallGeometry,
  createPolygonWallGeometry,
  createRoofGeometry,
  createPolygonRoofGeometry,
  createGableGeometry,
} from "./building3d/geometry";


const DEFAULT_WALL_HEIGHT = 0.8;
const DEFAULT_PITCH_SLOPE = 0.5;



interface Building3DProps {
  rect: Rectangle3D;
  allRects: Rectangle3D[];
  enableRoofDrag?: boolean;
}

export const Building3D = ({ rect, allRects, enableRoofDrag = false }: Building3DProps) => {
  const wallHeight = rect.wallHeight ?? DEFAULT_WALL_HEIGHT;
  const pitchSlope = rect.pitchAngle ?? DEFAULT_PITCH_SLOPE;
  const roofType = rect.roofType ?? "hip";
  const hasPolygonFootprint = !!rect.polygonFootprint && rect.polygonFootprint.length >= 3;
  const [hoveredSide, setHoveredSide] = useState<number | null>(null);
  const [selectedRoofSide, setSelectedRoofSide] = useAtom(selectedRoofSideAtom);
  const mode = useAtomValue(interactionModeAtom);
  const activeTool = useAtomValue(activeToolAtom);
  const selectedRectangleId = useAtomValue(selectedRectangleIdAtom);
  const setEditorData = useSetAtom(roofPanelEditorAtom);
  const setSelectedRectangleId = useSetAtom(selectedRectangleIdAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const setActivePanel = useSetAtom(activePanelAtom);
  const setSelectedLotId = useSetAtom(selectedLotIdAtom);
  const setChimneys = useSetAtom(chimneysAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const groupId = rect.id;
  const panelConfigs = useMatchingPanelConfigs(groupId);
  const {
    startRoofDrag,
    moveRoofDrag,
    endRoofDrag,
    consumeRoofDragClick,
  } = useRoofBodyDrag();

  const corners = useMemo(() => computeRectCorners(rect, allRects), [rect, allRects]);

  const wallGeometry = useMemo(
    () => hasPolygonFootprint
      ? createPolygonWallGeometry(rect.polygonFootprint!, wallHeight)
      : createWallGeometry(corners, wallHeight, roofType, rect.depth, pitchSlope, rect.shedDirection ?? "left"),
    [hasPolygonFootprint, rect.polygonFootprint, corners, wallHeight, roofType, rect.depth, pitchSlope, rect.shedDirection],
  );

  const roofGeometry = useMemo(
    () => hasPolygonFootprint
      ? createPolygonRoofGeometry(rect.polygonFootprint!, wallHeight)
      : createRoofGeometry(corners, rect.depth, wallHeight, roofType, pitchSlope, rect.shedDirection ?? "left"),
    [hasPolygonFootprint, rect.polygonFootprint, corners, rect.depth, wallHeight, roofType, pitchSlope, rect.shedDirection],
  );


  const roofRenderGeometry = useMemo(() => {
    const flat = roofGeometry.toNonIndexed();
    flat.computeVertexNormals();
    return flat;
  }, [roofGeometry]);

  const roofSides = useMemo(() => computeRoofSides(roofGeometry), [roofGeometry]);


  const roofSideData = useMemo(() => {
    return roofSides.groupGeometries.map((geo, idx) => {
      const pos = geo.getAttribute("position");
      const index = geo.getIndex();
      if (!pos || !index) return null;

      const vertices: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      }

      const indices: number[] = [];
      for (let i = 0; i < index.count; i++) {
        indices.push(index.getX(i));
      }

      const v0 = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();
      const edge1 = new THREE.Vector3();
      const edge2 = new THREE.Vector3();
      const avg = new THREE.Vector3();
      const numTris = index.count / 3;
      for (let t = 0; t < numTris; t++) {
        v0.fromBufferAttribute(pos, index.getX(t * 3));
        v1.fromBufferAttribute(pos, index.getX(t * 3 + 1));
        v2.fromBufferAttribute(pos, index.getX(t * 3 + 2));
        edge1.subVectors(v1, v0);
        edge2.subVectors(v2, v0);
        avg.add(new THREE.Vector3().crossVectors(edge1, edge2).normalize());
      }
      avg.normalize();


      if (avg.y < 0) avg.negate();

      return {
        groupId,
        rectId: rect.id,
        sideIndex: idx,
        vertices,
        indices,
        normal: [avg.x, avg.y, avg.z] as [number, number, number],
      } satisfies SelectedRoofSide;
    });
  }, [roofSides, groupId, rect.id]);

  const selectedSideIndex =
    selectedRoofSide?.groupId === groupId ? selectedRoofSide.sideIndex : null;

  const onRoofMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (moveRoofDrag(e)) return;

      e.stopPropagation();
      if (e.faceIndex != null) {
        const group = roofSides.faceToGroup.get(e.faceIndex);
        setHoveredSide(group ?? null);
        document.body.style.cursor = group != null ? "pointer" : "auto";
      }
    },
    [moveRoofDrag, roofSides],
  );

  const onRoofPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enableRoofDrag || mode !== "select" || activeTool !== "select") return;
      if (selectedRectangleId !== rect.id) {
        if (selectedRoofSide?.groupId !== groupId || e.faceIndex == null) return;

        const sideIdx = roofSides.faceToGroup.get(e.faceIndex);
        if (sideIdx !== selectedRoofSide.sideIndex) return;
      }

      startRoofDrag(e, rect.id);
    },
    [
      activeTool,
      enableRoofDrag,
      groupId,
      mode,
      rect.id,
      roofSides,
      selectedRectangleId,
      selectedRoofSide,
      startRoofDrag,
    ],
  );

  const onRoofClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (mode === "draw" && activeTool === "tree") return;
      if (consumeRoofDragClick()) return;

      e.stopPropagation();

      if (mode === "draw" && activeTool === "chimney") {
        const { localX, localZ } = getChimneyLocalPosition(
          rect,
          e.point.x,
          e.point.z,
        );
        const newChimney = {
          id: generateId(),
          rectangleId: rect.id,
          shape: "rectangular" as const,
          localX,
          localZ,
          width: 0.4,
          depth: 0.3,
          height: 0.8,
          color: "#8B4513",
        };
        setChimneys((prev) => [...prev, newChimney]);
        setSelectedChimneyId(newChimney.id);
        setSelectedRectangleId(null);
        setSelectedLotId(null);
        setSelectedRoofSide(null);
        return;
      }

      setSelectedRectangleId(rect.id);
      setSelectedTreeId(null);
      setActivePanel("roof");
      setSelectedLotId(null);
      setSelectedChimneyId(null);
      if (e.faceIndex != null) {
        const sideIdx = roofSides.faceToGroup.get(e.faceIndex);
        if (sideIdx != null && roofSideData[sideIdx]) {
          const data = roofSideData[sideIdx];
          if (data) {
            if (
              selectedRoofSide?.groupId === groupId &&
              selectedRoofSide?.sideIndex === sideIdx
            ) {
              setSelectedRoofSide(null);
            } else {
              setSelectedRoofSide(data);
            }
          }
        }
      }
    },
    [
      activeTool,
      mode,
      rect,
      roofSides,
      roofSideData,
      groupId,
      selectedRoofSide,
      setChimneys,
      setSelectedChimneyId,
      setSelectedLotId,
      setSelectedRectangleId,
      setSelectedTreeId,
      setActivePanel,
      setSelectedRoofSide,
      consumeRoofDragClick,
    ],
  );

  const onWallClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (mode === "draw" && activeTool === "tree") return;
      if (mode === "draw") return;

      e.stopPropagation();
      setSelectedRectangleId(rect.id);
      setSelectedTreeId(null);
      setActivePanel("roof");
      setSelectedLotId(null);
      setSelectedChimneyId(null);
      setSelectedRoofSide(null);
    },
    [
      activeTool,
      mode,
      rect.id,
      setSelectedChimneyId,
      setSelectedLotId,
      setSelectedRectangleId,
      setSelectedTreeId,
      setActivePanel,
      setSelectedRoofSide,
    ],
  );

  const onRoofDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.faceIndex != null) {
        const sideIdx = roofSides.faceToGroup.get(e.faceIndex);
        if (sideIdx != null && roofSideData[sideIdx]) {
          const data = roofSideData[sideIdx];
          if (data) {
            setEditorData({
              roofSideKey: `${groupId}:${sideIdx}`,
              groupId,
              rectId: data.rectId,
              sideIndex: sideIdx,
              vertices: data.vertices,
              indices: data.indices,
              normal: data.normal,
            });
          }
        }
      }
    },
    [roofSides, roofSideData, groupId, setEditorData],
  );

  const onRoofOut = useCallback(() => {
    setHoveredSide(null);
    document.body.style.cursor = "auto";
  }, []);

  const gableGeometry = useMemo(
    () => hasPolygonFootprint ? null : createGableGeometry(corners, rect.depth, wallHeight, roofType, pitchSlope),
    [hasPolygonFootprint, corners, rect.depth, wallHeight, roofType, pitchSlope],
  );


  const wallColor = useMemo(() => {
    const c = new THREE.Color(rect.color);
    c.multiplyScalar(1.1);
    return c;
  }, [rect.color]);

  const roofColor = useMemo(() => {
    const c = new THREE.Color(rect.color);
    c.multiplyScalar(0.7);
    return c;
  }, [rect.color]);

  return (
    <group>
      {}
      <mesh geometry={wallGeometry} onClick={onWallClick} castShadow>
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Roof surface */}
      <mesh
        geometry={roofRenderGeometry}
        castShadow
        receiveShadow
        onPointerDown={onRoofPointerDown}
        onPointerMove={onRoofMove}
        onPointerUp={endRoofDrag}
        onPointerCancel={endRoofDrag}
        onPointerOut={onRoofOut}
        onClick={onRoofClick}
        onDoubleClick={onRoofDoubleClick}
      >
        <meshStandardMaterial
          color={roofColor}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={rect.id.charCodeAt(0) % 2 === 0 ? 1 : -1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Selected roof side highlight (green) */}
      {selectedSideIndex != null &&
        roofSides.groupGeometries[selectedSideIndex] && (
          <mesh geometry={roofSides.groupGeometries[selectedSideIndex]}>
            <meshStandardMaterial
              color="#4caf50"
              side={THREE.DoubleSide}
              transparent
              opacity={0.45}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-3}
              polygonOffsetUnits={-3}
            />
          </mesh>
        )}

      {/* Hovered roof side highlight */}
      {hoveredSide != null &&
        hoveredSide !== selectedSideIndex &&
        roofSides.groupGeometries[hoveredSide] && (
        <mesh geometry={roofSides.groupGeometries[hoveredSide]}>
          <meshStandardMaterial
            color="#5ba8ff"
            side={THREE.DoubleSide}
            transparent
            opacity={0.5}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}

      {/* Gable wall fills */}
      {gableGeometry && (
        <mesh geometry={gableGeometry}>
          <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Edges for visual clarity */}
      <lineSegments>
        <edgesGeometry args={[wallGeometry]} />
        <lineBasicMaterial color="#333333" />
      </lineSegments>
      <lineSegments>
        <edgesGeometry args={[roofGeometry]} />
        <lineBasicMaterial color="#333333" />
      </lineSegments>

      {/* Solar panels — rendered from current geometry */}
      {panelConfigs.length > 0 &&
        roofSideData.map((sideData, idx) => {
          if (!sideData) return null;
          const key = `${groupId}:${idx}`;
          const config = panelConfigs.find((c) => c.roofSideKey === key);
          if (!config) return null;
          return (
            <RoofSidePanels
              key={key}
              roofSideKey={key}
              vertices={sideData.vertices}
              indices={sideData.indices}
              normal={sideData.normal}
              config={config}
              rect={rect}
            />
          );
        })}
    </group>
  );
};
