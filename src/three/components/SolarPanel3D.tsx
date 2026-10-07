import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { extend, type ThreeEvent } from "@react-three/fiber";
import { useAtomValue, useSetAtom } from "jotai";
import {
  solarPanelConfigsAtom,
  generatePanelsForRoofSide,
  manualPanelsToInstances,
  chimneysToObstacles,
  neighborRoofObstaclePolygons,
  renderedPanelsAtom,
  selectedSolarPanelAtom,
  type SolarPanelInstance,
  type SolarPanelConfig,
} from "../store/solarPanelStore";
import { chimneysAtom, type Rectangle3D } from "../store/rectangleStore";
import { SolarPanelShaderMaterial, calculateCellCount } from "../shaders/SolarPanelMaterial";


extend({ SolarPanelShaderMaterial });


function PanelMesh({
  panel,
  width,
  height,
  roofSideKey,
  panelIndex,
  isSelected,
  standHeight = 0,
}: {
  panel: SolarPanelInstance;
  width: number;
  height: number;
  roofSideKey: string;
  panelIndex: number;
  isSelected: boolean;
  standHeight?: number;
}) {
  const setSelectedPanel = useSetAtom(selectedSolarPanelAtom);
  const quaternion = useMemo(() => {
    const r = new THREE.Vector3(...panel.right);
    const u = new THREE.Vector3(...panel.up);
    const n = new THREE.Vector3(...panel.normal);
    const m = new THREE.Matrix4().makeBasis(r, u, n);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [panel.right, panel.up, panel.normal]);

  const panelThickness = 0.012;
  const panelEdgeColor = "#5fb7e8";
  const legThickness = 0.02;

  const topSurfacePosition = useMemo(() => {
    const position = new THREE.Vector3(...panel.position);
    const normal = new THREE.Vector3(...panel.normal);
    return position.addScaledVector(normal, panelThickness / 2 + 0.0005).toArray() as [
      number,
      number,
      number,
    ];
  }, [panel.position, panel.normal]);


  const { cellsX, cellsY } = useMemo(
    () => calculateCellCount(width, height, 0.166),
    [width, height]
  );


  const standLegs = useMemo(() => {
    if (standHeight <= 0.001) return null;
    const r = new THREE.Vector3(...panel.right);
    const u = new THREE.Vector3(...panel.up);
    const n = new THREE.Vector3(...panel.normal);
    const center = new THREE.Vector3(...panel.position);
    const halfW = width / 2 - 0.02;
    const halfH = height / 2 - 0.02;


    const sinT = Math.abs(u.y);
    const surfaceY =
      center.y - panelThickness / 2 - 0.01 - standHeight - (height / 2) * sinT;

    const offsets: Array<[number, number]> = [
      [-halfW, -halfH],
      [halfW, -halfH],
      [-halfW, halfH],
      [halfW, halfH],
    ];

    return offsets.map(([dx, dy], i) => {

      const corner = center
        .clone()
        .addScaledVector(r, dx)
        .addScaledVector(u, dy)
        .addScaledVector(n, -panelThickness / 2);

      const legLen = Math.max(0.01, corner.y - surfaceY + 0.005);
      const legCenter: [number, number, number] = [
        corner.x,
        corner.y - legLen / 2,
        corner.z,
      ];
      return { key: i, position: legCenter, length: legLen };
    });
  }, [standHeight, panel.position, panel.right, panel.up, panel.normal, width, height]);

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedPanel({ roofSideKey, panelIndex });
  };

  return (
    <group>
      {}
      <mesh
        position={panel.position}
        quaternion={quaternion}
        onDoubleClick={handleDoubleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, panelThickness]} />
        <meshStandardMaterial
          color={isSelected ? "#ff9800" : panelEdgeColor}
          emissive={isSelected ? "#ff9800" : "#000000"}
          emissiveIntensity={isSelected ? 0.35 : 0}
          metalness={0.45}
          roughness={0.35}
        />
      </mesh>
      {/* Solar-cell face */}
      <mesh
        position={topSurfacePosition}
        quaternion={quaternion}
        onDoubleClick={handleDoubleClick}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[width, height]} />
        <solarPanelShaderMaterial
          cellsX={cellsX}
          cellsY={cellsY}
          cellColor={new THREE.Color(0x0d47a1)}
          gridColor={new THREE.Color(0xffffff)}
          cornerColor={new THREE.Color(0x0d47a1)}
          gridLineWidth={0.035}
          cornerRadius={0.01}
          busbarsPerCell={5}
          roughness={0.15}
          metalness={0.8}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Panel border / frame for visibility in orthographic views */}
      <lineSegments position={panel.position} quaternion={quaternion}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, panelThickness)]} />
        <lineBasicMaterial color={isSelected ? "#ff9800" : panelEdgeColor} />
      </lineSegments>
      {isSelected && (
        <mesh position={topSurfacePosition} quaternion={quaternion}>
          <planeGeometry args={[width * 1.08, height * 1.08]} />
          <meshBasicMaterial
            color="#ff9800"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* Mounting stand legs (vertical, per-corner length) */}
      {standLegs?.map((leg) => (
        <mesh key={leg.key} position={leg.position} castShadow>
          <boxGeometry args={[legThickness, leg.length, legThickness]} />
          <meshStandardMaterial color="#5c6370" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}


export function RoofSidePanels({
  roofSideKey,
  vertices,
  indices,
  normal,
  config,
  rect,
  rects,
  ownerRectId,
}: {
  roofSideKey: string;
  vertices: number[];
  indices: number[];
  normal: [number, number, number];
  config: SolarPanelConfig;
  rect?: Rectangle3D;
  rects?: Rectangle3D[];
  ownerRectId?: string;
}) {
  const setRenderedPanels = useSetAtom(renderedPanelsAtom);
  const chimneys = useAtomValue(chimneysAtom);
  const selectedPanel = useAtomValue(selectedSolarPanelAtom);


  const panels = useMemo(() => {
    if (
      config.layoutMode === "manual" &&
      config.manualPanels &&
      config.manualPanels.length > 0
    ) {
      return manualPanelsToInstances(
        config.manualPanels,
        vertices,
        normal,
        config.standHeight ?? 0,
        config.inclinationAngle ?? 0,
      );
    }


    let obstacles: ReturnType<typeof chimneysToObstacles> = [];
    let obstaclePolygons: { x: number; y: number }[][] = [];

    if (rect) {

      obstacles = chimneysToObstacles(chimneys, rect, vertices, normal);
    } else if (rects && rects.length > 0) {


      obstacles = rects.flatMap((r) => chimneysToObstacles(chimneys, r, vertices, normal));
      if (ownerRectId) {
        obstaclePolygons = neighborRoofObstaclePolygons(
          rects,
          vertices,
          normal,
          ownerRectId,
          indices,
        );
      }
    }

    return generatePanelsForRoofSide(
      vertices,
      indices,
      normal,
      config.panelWidth,
      config.panelHeight,
      config.columnSpacing ?? 0.03,
      obstacles,
      config.rotationAngle ?? 0,
      config.rowSpacing,
      config.standHeight ?? 0,
      config.inclinationAngle ?? 0,
      obstaclePolygons,
    );
  }, [
    vertices,
    indices,
    normal,
    config.panelWidth,
    config.panelHeight,
    config.columnSpacing,
    config.layoutMode,
    config.manualPanels,
    config.rotationAngle,
    config.rowSpacing,
    config.standHeight,
    config.inclinationAngle,
    rect,
    rects,
    ownerRectId,
    chimneys,
  ]);


  const panelDimensions = useMemo(() => {
    if (
      config.layoutMode === "manual" &&
      config.manualPanels &&
      config.manualPanels.length > 0
    ) {
      return config.manualPanels.map((mp) => ({ width: mp.width, height: mp.height }));
    }
    return panels.map(() => ({ width: config.panelWidth, height: config.panelHeight }));
  }, [config.layoutMode, config.manualPanels, config.panelWidth, config.panelHeight, panels]);


  useEffect(() => {
    setRenderedPanels((prev) => {
      const next = new Map(prev);
      next.set(roofSideKey, {
        panels,
        panelWidth: config.panelWidth,
        panelHeight: config.panelHeight,
        panelWattage: config.panelWattage,
      });
      return next;
    });
    return () => {

      setRenderedPanels((prev) => {
        const next = new Map(prev);
        next.delete(roofSideKey);
        return next;
      });
    };
  }, [
    roofSideKey,
    panels,
    config.panelWidth,
    config.panelHeight,
    config.panelWattage,
    setRenderedPanels,
  ]);

  if (panels.length === 0) return null;

  return (
    <group>
      {panels.map((panel, idx) => (
        <PanelMesh
          key={idx}
          panel={panel}
          width={panelDimensions[idx]?.width ?? config.panelWidth}
          height={panelDimensions[idx]?.height ?? config.panelHeight}
          roofSideKey={roofSideKey}
          panelIndex={idx}
          isSelected={
            selectedPanel?.roofSideKey === roofSideKey &&
            selectedPanel.panelIndex === idx
          }
          standHeight={config.standHeight ?? 0}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------


export function useMatchingPanelConfigs(groupId: string): SolarPanelConfig[] {
  const configs = useAtomValue(solarPanelConfigsAtom);
  return useMemo(
    () => configs.filter((c) => c.roofSideKey.startsWith(groupId + ":")),
    [configs, groupId],
  );
}
