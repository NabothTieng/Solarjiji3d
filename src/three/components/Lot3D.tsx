import { useMemo, useCallback } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import * as THREE from "three";
import {
  lotsAtom,
  selectedLotIdAtom,
  buildLotSurface,
  getLotBounds,
  LOT_SURFACE_Y,
  lotRoofSideKey,
  type Lot3D,
} from "../store/lotStore";
import {
  solarPanelConfigsAtom,
  roofPanelEditorAtom,
} from "../store/solarPanelStore";
import {
  activeToolAtom,
  interactionModeAtom,
  selectedRectangleIdAtom,
} from "../store/rectangleStore";
import { RoofSidePanels } from "./SolarPanel3D";

const SELECTED_COLOR = "#ffa500";
const DEFAULT_LOT_COLOR = "#7cb87c";

interface SingleLotProps {
  lot: Lot3D;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpenEditor: (lot: Lot3D) => void;
}

function SingleLot({ lot, isSelected, onSelect, onOpenEditor }: SingleLotProps) {
  const mode = useAtomValue(interactionModeAtom);
  const activeTool = useAtomValue(activeToolAtom);
  const { minX, maxX, minZ, maxZ } = useMemo(() => getLotBounds(lot), [lot]);
  const width = Math.max(maxX - minX, 0.001);
  const depth = Math.max(maxZ - minZ, 0.001);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  const panelConfigs = useAtomValue(solarPanelConfigsAtom);
  const roofSideKey = lotRoofSideKey(lot.id);
  const config = useMemo(
    () => panelConfigs.find((c) => c.roofSideKey === roofSideKey),
    [panelConfigs, roofSideKey],
  );

  const surface = useMemo(() => buildLotSurface(lot), [lot]);
  const hasPolygonFootprint = !!lot.polygonFootprint && lot.polygonFootprint.length >= 3;
  const lotGeometry = useMemo(() => {
    if (!hasPolygonFootprint) return null;
    const vertices = lot.polygonFootprint!.map((p) => new THREE.Vector2(p[0], p[2]));
    const triangles = THREE.ShapeUtils.triangulateShape(vertices, []);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(lot.polygonFootprint!.flatMap((p) => [p[0], LOT_SURFACE_Y, p[2]])),
        3,
      ),
    );
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(triangles.flat()), 1));
    geometry.computeVertexNormals();
    return geometry;
  }, [hasPolygonFootprint, lot.polygonFootprint]);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (mode === "draw" && activeTool === "tree") return;

      e.stopPropagation();
      onSelect(lot.id);
    },
    [activeTool, lot.id, mode, onSelect],
  );

  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onOpenEditor(lot);
    },
    [lot, onOpenEditor],
  );


  const outlinePoints = useMemo(() => {
    const y = LOT_SURFACE_Y + 0.002;
    if (hasPolygonFootprint) {
      return new Float32Array([
        ...lot.polygonFootprint!.flatMap((p) => [p[0], y, p[2]]),
        lot.polygonFootprint![0][0], y, lot.polygonFootprint![0][2],
      ]);
    }

    return new Float32Array([
      minX, y, minZ,
      maxX, y, minZ,
      maxX, y, maxZ,
      minX, y, maxZ,
      minX, y, minZ,
    ]);
  }, [hasPolygonFootprint, lot.polygonFootprint, minX, maxX, minZ, maxZ]);

  return (
    <group>
      {}
      <mesh
        geometry={lotGeometry ?? undefined}
        position={hasPolygonFootprint ? [0, 0, 0] : [cx, LOT_SURFACE_Y, cz]}
        rotation={hasPolygonFootprint ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        receiveShadow
      >
        {!hasPolygonFootprint && <planeGeometry args={[width, depth]} />}
        <meshStandardMaterial
          color={lot.color}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border outline */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[outlinePoints, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={isSelected ? SELECTED_COLOR : "#2e7d32"}
          linewidth={2}
        />
      </lineLoop>

      {/* Solar panels on the lot (auto / manual) */}
      {config && (
        <RoofSidePanels
          roofSideKey={roofSideKey}
          vertices={surface.vertices}
          indices={surface.indices}
          normal={surface.normal}
          config={config}
        />
      )}
    </group>
  );
}

/**
 * Renders all lots and any solar panels placed on them.
 * Used in both the 2D top-plan view and the 3D viewer.
 */
export function Lots3D() {
  const lots = useAtomValue(lotsAtom);
  const [selectedLotId, setSelectedLotId] = useAtom(selectedLotIdAtom);
  const setSelectedRectangleId = useSetAtom(selectedRectangleIdAtom);
  const setEditorData = useSetAtom(roofPanelEditorAtom);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedLotId(id);
      setSelectedRectangleId(null);
    },
    [setSelectedLotId, setSelectedRectangleId],
  );

  const handleOpenEditor = useCallback(
    (lot: Lot3D) => {
      const surface = buildLotSurface(lot);
      const groupId = `lot:${lot.id}`;
      setEditorData({
        roofSideKey: lotRoofSideKey(lot.id),
        groupId,
        sideIndex: 0,
        vertices: surface.vertices,
        indices: surface.indices,
        normal: surface.normal,
      });
    },
    [setEditorData],
  );

  if (lots.length === 0) return null;

  return (
    <group>
      {lots.map((lot) => (
        <SingleLot
          key={lot.id}
          lot={lot}
          isSelected={lot.id === selectedLotId}
          onSelect={handleSelect}
          onOpenEditor={handleOpenEditor}
        />
      ))}
    </group>
  );
}

export { DEFAULT_LOT_COLOR };
