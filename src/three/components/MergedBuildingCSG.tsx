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
  buildGroupGeometryDirect,
  findRectAtPoint,
} from "./mergedBuildingCSG/geometry";



interface MergedBuildingCSGProps {
  groups: Rectangle3D[][];
  enableRoofDrag?: boolean;
}



function MergedMesh({
  geometry,
  color,
  groupId,
  rects,
  faceScopes,
  enableRoofDrag,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  groupId: string;
  rects: Rectangle3D[];
  faceScopes: string[];
  enableRoofDrag: boolean;
}) {
  const [hoveredSide, setHoveredSide] = useState<number | null>(null);
  const [selectedRoofSide, setSelectedRoofSide] = useAtom(selectedRoofSideAtom);
  const mode = useAtomValue(interactionModeAtom);
  const activeTool = useAtomValue(activeToolAtom);
  const selectedRectangleId = useAtomValue(selectedRectangleIdAtom);
  const setEditorData = useSetAtom(roofPanelEditorAtom);
  const setSelectedRectangleId = useSetAtom(selectedRectangleIdAtom);
  const setSelectedLotId = useSetAtom(selectedLotIdAtom);
  const setChimneys = useSetAtom(chimneysAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const panelConfigs = useMatchingPanelConfigs(groupId);
  const {
    startRoofDrag,
    moveRoofDrag,
    endRoofDrag,
    consumeRoofDragClick,
  } = useRoofBodyDrag();
  const isFlatRoofGroup = rects.every(
    (rect) => (rect.roofType ?? "hip") === "flat",
  );


  const roofSides = useMemo(
    () => computeRoofSides(geometry, 0.15, isFlatRoofGroup ? undefined : faceScopes),
    [geometry, faceScopes, isFlatRoofGroup],
  );


  const renderGeometry = useMemo(() => {
    const flat = geometry.toNonIndexed();
    flat.computeVertexNormals();

    const pos = flat.getAttribute("position");
    const faceCount = pos.count / 3;
    const colors = new Float32Array(pos.count * 3);

    const rectById = new Map(rects.map((rect) => [rect.id, rect]));

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let f = 0; f < faceCount; f++) {
      a.fromBufferAttribute(pos, f * 3);
      b.fromBufferAttribute(pos, f * 3 + 1);
      c.fromBufferAttribute(pos, f * 3 + 2);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      n.crossVectors(ab, ac).normalize();

      const scope = faceScopes[f];
      const baseColor = rectById.get(String(scope))?.color ?? color;
      const tint = new THREE.Color(baseColor).multiplyScalar(n.y > 0.15 ? 0.7 : 1.1);
      for (let v = 0; v < 3; v++) {
        const ci = (f * 3 + v) * 3;
        colors[ci] = tint.r;
        colors[ci + 1] = tint.g;
        colors[ci + 2] = tint.b;
      }
    }

    flat.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3),
    );
    return flat;
  }, [geometry, color, rects, faceScopes]);


  const roofSideData = useMemo(() => {
    const rectIdBySide = new Map<number, string>();
    const scopeCounts = new Map<number, Map<string, number>>();
    faceScopes.forEach((scope, faceIdx) => {
      const sideIdx = roofSides.faceToGroup.get(faceIdx);
      if (sideIdx == null || scope == null) return;
      const key = String(scope);
      let counts = scopeCounts.get(sideIdx);
      if (!counts) {
        counts = new Map<string, number>();
        scopeCounts.set(sideIdx, counts);
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    for (const [sideIdx, counts] of scopeCounts) {
      let bestRectId: string | undefined;
      let bestCount = -1;
      for (const [rectId, count] of counts) {
        if (count > bestCount) {
          bestRectId = rectId;
          bestCount = count;
        }
      }
      if (bestRectId) rectIdBySide.set(sideIdx, bestRectId);
    }

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
        rectId: isFlatRoofGroup ? undefined : rectIdBySide.get(idx),
        sideIndex: idx,
        vertices,
        indices,
        normal: [avg.x, avg.y, avg.z] as [number, number, number],
      } satisfies SelectedRoofSide;
    });
  }, [roofSides, groupId, faceScopes, isFlatRoofGroup]);


  const selectedSideIndex =
    selectedRoofSide?.groupId === groupId ? selectedRoofSide.sideIndex : null;

  const onMove = useCallback(
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

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enableRoofDrag || mode !== "select" || activeTool !== "select") return;
      const hitRect = findRectAtPoint(rects, e.point);
      if (selectedRectangleId !== hitRect.id) {
        if (selectedRoofSide?.groupId !== groupId || e.faceIndex == null) return;

        const sideIdx = roofSides.faceToGroup.get(e.faceIndex);
        if (sideIdx !== selectedRoofSide.sideIndex) return;
      }

      startRoofDrag(e, hitRect.id);
    },
    [
      activeTool,
      enableRoofDrag,
      groupId,
      mode,
      rects,
      roofSides,
      selectedRectangleId,
      selectedRoofSide,
      startRoofDrag,
    ],
  );

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (mode === "draw" && activeTool === "tree") return;
      if (consumeRoofDragClick()) return;

      e.stopPropagation();
      const hitRect = findRectAtPoint(rects, e.point);

      if (mode === "draw" && activeTool === "chimney") {
        const { localX, localZ } = getChimneyLocalPosition(
          hitRect,
          e.point.x,
          e.point.z,
        );
        const newChimney = {
          id: generateId(),
          rectangleId: hitRect.id,
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

      setSelectedRectangleId(hitRect.id);
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
      rects,
      roofSides,
      roofSideData,
      groupId,
      selectedRoofSide,
      setChimneys,
      setSelectedChimneyId,
      setSelectedLotId,
      setSelectedRectangleId,
      setSelectedRoofSide,
      consumeRoofDragClick,
    ],
  );

  const onDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      console.log("DOUBLE CLICK");
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

  const onOut = useCallback(() => {
    setHoveredSide(null);
    document.body.style.cursor = "auto";
  }, []);

  return (
    <group>
      <mesh
        geometry={renderGeometry}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerMove={onMove}
        onPointerUp={endRoofDrag}
        onPointerCancel={endRoofDrag}
        onPointerOut={onOut}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
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

      {/* Hovered roof side highlight (blue, skip if same as selected) */}
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
              rects={rects}
              ownerRectId={sideData.rectId}
            />
          );
        })}
    </group>
  );
}

export const MergedBuildingCSG = ({
  groups,
  enableRoofDrag = false,
}: MergedBuildingCSGProps) => {
  const mergedGeometries = useMemo(() => {
    return groups.map((group) => {
      return {
        merged: buildGroupGeometryDirect(group),
        color: group[0].color,
        id: group.map((r) => r.id).join("+"),
        rects: group,
      };
    });
  }, [groups]);

  return (
    <>
      {mergedGeometries.map(
        ({ merged, color, id, rects }) =>
          merged && (
            <MergedMesh
              key={id}
              geometry={merged.geometry}
              color={color}
              groupId={id}
              rects={rects}
              faceScopes={merged.faceScopes}
              enableRoofDrag={enableRoofDrag}
            />
          ),
      )}
    </>
  );
};
