import { useRef, useMemo, useCallback, useState } from "react";
import * as THREE from "three";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  chimneysAtom,
  selectedChimneyIdAtom,
  rectanglesAtom,
  selectedRectangleIdAtom,
  isDraggingHandleAtom,
  type Chimney3D as ChimneyType,
  type Rectangle3D,
  getChimneyWorldPosition,
  getRectRotation,
  getRectWidth,
  getChimneyLocalPosition,
} from "../store/rectangleStore";
import type { ThreeEvent } from "@react-three/fiber";


const Y_SURFACE = 0.025;
const PITCH_SLOPE = 0.5;
const DEFAULT_WALL_HEIGHT = 0.8;


function getRoofSurfaceHeight(
  rect: Rectangle3D,
  localX: number,
  localZ: number
): number {


  const baseY = (rect.wallHeight ?? DEFAULT_WALL_HEIGHT) + Y_SURFACE;
  const halfDepth = rect.depth / 2;
  const roofType = rect.roofType || "hip";
  const pitchSlope = rect.pitchAngle ?? PITCH_SLOPE;

  switch (roofType) {
    case "flat":
      return baseY + 0.02;

    case "shed": {
      const highY = baseY + halfDepth * pitchSlope;
      const sign = (rect.shedDirection ?? "left") === "left" ? -1 : 1;

      const signedZ = sign * localZ;
      const t = (signedZ + halfDepth) / rect.depth;
      return baseY + (highY - baseY) * Math.max(0, Math.min(1, t));
    }

    case "hip": {

      const ridgeH = baseY + halfDepth * pitchSlope;
      const distFromCenterZ = Math.abs(localZ);
      const slopeRatioZ = distFromCenterZ / halfDepth;


      const roofLength = getRectWidth(rect);
      const ridgeInset = rect.depth * 0.3;
      const halfLength = roofLength / 2;
      const distFromCenterX = Math.abs(localX);

      let slopeRatioX = 0;
      if (distFromCenterX > halfLength - ridgeInset) {
        slopeRatioX = (distFromCenterX - (halfLength - ridgeInset)) / ridgeInset;
      }

      const maxSlopeRatio = Math.max(slopeRatioZ, slopeRatioX);
      return ridgeH - (ridgeH - baseY) * Math.min(maxSlopeRatio, 1);
    }

    case "gambrel": {

      const ridgeH = baseY + halfDepth * pitchSlope;
      const breakInset = halfDepth * 0.4;
      const breakHeight = baseY + halfDepth * pitchSlope * 0.6;

      const distFromCenterZ = Math.abs(localZ);

      if (distFromCenterZ <= breakInset) {

        const slopeRatio = distFromCenterZ / breakInset;
        return ridgeH - (ridgeH - breakHeight) * slopeRatio;
      } else {

        const distFromBreak = distFromCenterZ - breakInset;
        const slopeRange = halfDepth - breakInset;
        const slopeRatio = distFromBreak / slopeRange;
        return breakHeight - (breakHeight - baseY) * slopeRatio;
      }
    }

    default: {

      const ridgeHDefault = baseY + halfDepth * pitchSlope;
      const distDefault = Math.abs(localZ);
      const ratioDefault = distDefault / halfDepth;
      return ridgeHDefault - (ridgeHDefault - baseY) * ratioDefault;
    }
  }
}


function clampToRoofBounds(
  rect: Rectangle3D,
  chimney: ChimneyType,
  localX: number,
  localZ: number
): { localX: number; localZ: number } {
  const halfDepth = rect.depth / 2;
  const halfLength = getRectWidth(rect) / 2;


  const chimneyHalfW = chimney.width / 2;
  const chimneyHalfD =
    (chimney.shape === "circular" ? chimney.width : chimney.depth) / 2;


  const maxX = Math.max(0, halfLength - chimneyHalfW);
  const maxZ = Math.max(0, halfDepth - chimneyHalfD);

  return {
    localX: Math.max(-maxX, Math.min(maxX, localX)),
    localZ: Math.max(-maxZ, Math.min(maxZ, localZ)),
  };
}


interface ChimneyMeshProps {
  chimney: ChimneyType;
  rectangle: Rectangle3D;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (chimneyId: string) => void;
  isDragging: boolean;
}

function ChimneyMesh({
  chimney,
  rectangle,
  isSelected,
  onSelect,
  onDragStart,
  isDragging,
}: ChimneyMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);


  const [worldX, , worldZ] = getChimneyWorldPosition(rectangle, chimney);
  const rotation = getRectRotation(rectangle);


  const halfW = chimney.width / 2;
  const halfD = (chimney.shape === "circular" ? chimney.width : chimney.depth) / 2;
  const sampleOffsets: Array<[number, number]> = [
    [0, 0],
    [halfW, halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [-halfW, -halfD],
    [halfW, 0],
    [-halfW, 0],
    [0, halfD],
    [0, -halfD],
  ];
  let roofMaxY = -Infinity;
  let roofMinY = Infinity;
  for (const [dx, dz] of sampleOffsets) {
    const y = getRoofSurfaceHeight(
      rectangle,
      chimney.localX + dx,
      chimney.localZ + dz,
    );
    if (y > roofMaxY) roofMaxY = y;
    if (y < roofMinY) roofMinY = y;
  }
  const skirt = roofMaxY - roofMinY;
  const totalHeight = chimney.height + skirt;
  const chimneyY = roofMinY + totalHeight / 2;


  const geometry = useMemo(() => {
    if (chimney.shape === "circular") {
      return new THREE.CylinderGeometry(
        chimney.width / 2,
        chimney.width / 2,
        totalHeight,
        32
      );
    } else {
      return new THREE.BoxGeometry(
        chimney.width,
        totalHeight,
        chimney.depth
      );
    }
  }, [chimney.shape, chimney.width, chimney.depth, totalHeight]);


  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: chimney.color,
      transparent: true,
      opacity: isDragging ? 0.7 : 0.9,
      emissive: isSelected ? new THREE.Color(0xfab387) : new THREE.Color(0x000000),
      emissiveIntensity: isSelected ? 0.4 : 0,
    });
  }, [chimney.color, isSelected, isDragging]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(chimney.id);
    onDragStart(chimney.id);
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[worldX, chimneyY, worldZ]}
      rotation={[0, rotation, 0]}
      onPointerDown={handlePointerDown}
      castShadow
      receiveShadow
    >
      {}
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#fab387" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}


interface ChimneyDragPlaneProps {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
}

function ChimneyDragPlane({ onPointerMove, onPointerUp }: ChimneyDragPlaneProps) {
  return (
    <mesh
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      visible={false}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------


interface Chimneys3DProps {


  interactive?: boolean;
}

export function Chimneys3D({ interactive = true }: Chimneys3DProps = {}) {
  const [chimneys, setChimneys] = useAtom(chimneysAtom);
  const rectangles = useAtomValue(rectanglesAtom);
  const [selectedChimneyId, setSelectedChimneyId] = useAtom(selectedChimneyIdAtom);
  const setSelectedRectangleId = useSetAtom(selectedRectangleIdAtom);

  const [draggingChimneyId, setDraggingChimneyId] = useState<string | null>(null);
  const setIsDraggingHandle = useSetAtom(isDraggingHandleAtom);

  const handleSelect = useCallback((id: string) => {
    setSelectedChimneyId(id);

    setSelectedRectangleId(null);
  }, [setSelectedChimneyId, setSelectedRectangleId]);

  const handleDragStart = useCallback((chimneyId: string) => {
    setDraggingChimneyId(chimneyId);
    setIsDraggingHandle(true);
  }, [setIsDraggingHandle]);

  const handleDragEnd = useCallback(() => {
    setDraggingChimneyId(null);
    setIsDraggingHandle(false);
  }, [setIsDraggingHandle]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!draggingChimneyId) return;

    const chimney = chimneys.find((c) => c.id === draggingChimneyId);
    if (!chimney) return;

    const rectangle = rectangles.find((r) => r.id === chimney.rectangleId);
    if (!rectangle) return;


    const { localX, localZ } = getChimneyLocalPosition(
      rectangle,
      e.point.x,
      e.point.z
    );


    const clamped = clampToRoofBounds(rectangle, chimney, localX, localZ);


    setChimneys((prev) =>
      prev.map((c) =>
        c.id === draggingChimneyId
          ? { ...c, localX: clamped.localX, localZ: clamped.localZ }
          : c
      )
    );
  }, [draggingChimneyId, chimneys, rectangles, setChimneys]);

  const handlePointerUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);


  const noopDragStart = useCallback(() => {}, []);

  return (
    <group name="chimneys">
      {}
      {interactive && draggingChimneyId && (
        <ChimneyDragPlane
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      )}

      {chimneys.map((chimney) => {
        const rectangle = rectangles.find((r) => r.id === chimney.rectangleId);
        if (!rectangle) return null;

        return (
          <ChimneyMesh
            key={chimney.id}
            chimney={chimney}
            rectangle={rectangle}
            isSelected={selectedChimneyId === chimney.id}
            onSelect={handleSelect}
            onDragStart={interactive ? handleDragStart : noopDragStart}
            isDragging={interactive && draggingChimneyId === chimney.id}
          />
        );
      })}
    </group>
  );
}
