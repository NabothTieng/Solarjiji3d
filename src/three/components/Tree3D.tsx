import { useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  trees3DAtom,
  selectedTreeIdAtom,
  selectedRectangleIdAtom,
  selectedChimneyIdAtom,
  interactionModeAtom,
  activeToolAtom,
  isDraggingHandleAtom,
  type Tree3D,
} from "../store/rectangleStore";
import { selectedLotIdAtom } from "../store/lotStore";


function rayToGround(e: ThreeEvent<PointerEvent>): { x: number; z: number } | null {
  const ray = e.ray;
  if (Math.abs(ray.direction.y) < 1e-6) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (!Number.isFinite(t)) return null;
  return {
    x: ray.origin.x + t * ray.direction.x,
    z: ray.origin.z + t * ray.direction.z,
  };
}


function useTreeDragHandlers(tree: Tree3D) {
  const setTrees = useSetAtom(trees3DAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const setSelectedRectangleId = useSetAtom(selectedRectangleIdAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const setSelectedLotId = useSetAtom(selectedLotIdAtom);
  const setIsDraggingHandle = useSetAtom(isDraggingHandleAtom);
  const mode = useAtomValue(interactionModeAtom);
  const activeTool = useAtomValue(activeToolAtom);

  const dragOffsetRef = useRef<{ x: number; z: number } | null>(null);
  const didMoveRef = useRef(false);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {


    if (mode === "draw" && activeTool !== "tree") return;

    e.stopPropagation();
    setSelectedTreeId(tree.id);

    setSelectedRectangleId(null);
    setSelectedChimneyId(null);
    setSelectedLotId(null);


    if (mode !== "select") return;

    const ground = rayToGround(e);
    if (ground) {
      dragOffsetRef.current = {
        x: ground.x - tree.position[0],
        z: ground.z - tree.position[2],
      };
    } else {
      dragOffsetRef.current = { x: 0, z: 0 };
    }
    didMoveRef.current = false;
    setIsDraggingHandle(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const offset = dragOffsetRef.current;
    if (!offset) return;
    e.stopPropagation();
    const ground = rayToGround(e);
    if (!ground) return;
    const nx = ground.x - offset.x;
    const nz = ground.z - offset.z;
    if (
      Math.abs(nx - tree.position[0]) < 1e-4 &&
      Math.abs(nz - tree.position[2]) < 1e-4
    ) {
      return;
    }
    didMoveRef.current = true;
    setTrees((prev) =>
      prev.map((t) =>
        t.id === tree.id
          ? { ...t, position: [nx, t.position[1], nz] as [number, number, number] }
          : t,
      ),
    );
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (dragOffsetRef.current === null) return;
    dragOffsetRef.current = null;
    setIsDraggingHandle(false);
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {

    }
  };

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag };
}


function TreeMesh({
  tree,
  isSelected,
  showGroundCircle = false,
  compactCanopy = false,
}: {
  tree: Tree3D;
  isSelected: boolean;
  showGroundCircle?: boolean;
  compactCanopy?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const trunkHeight = tree.height * 0.35;
  const canopyRadius = compactCanopy ? tree.radius * 0.55 : tree.radius;
  const canopyCenter = trunkHeight + canopyRadius * 0.7;
  const footprintRadius = Math.max(tree.radius, 0.03);
  const footprintInnerRadius = Math.max(footprintRadius - 0.04, footprintRadius * 0.7);
  const dragHandlers = useTreeDragHandlers(tree);

  return (
    <group ref={groupRef} position={tree.position} {...dragHandlers}>
      {showGroundCircle && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
            <circleGeometry args={[footprintRadius, 48]} />
            <meshBasicMaterial
              color="#ffcc00"
              transparent
              opacity={0.16}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
            <ringGeometry args={[footprintInnerRadius, footprintRadius, 64]} />
            <meshBasicMaterial
              color="#ffcc00"
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry
          args={[canopyRadius * 0.12, canopyRadius * 0.15, trunkHeight, 8]}
        />
        <meshStandardMaterial color="#5D4037" />
      </mesh>

      {/* Canopy — sphere */}
      <mesh position={[0, canopyCenter, 0]} castShadow>
        <sphereGeometry args={[canopyRadius, 16, 12]} />
        <meshStandardMaterial
          color={tree.color}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[tree.radius + 0.1, tree.radius + 0.25, 32]} />
          <meshBasicMaterial color="#ffa500" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}


export function Trees3D({
  showGroundCircle = false,
  compactCanopy = false,
}: {
  showGroundCircle?: boolean;
  compactCanopy?: boolean;
}) {
  const trees = useAtomValue(trees3DAtom);
  const selectedId = useAtomValue(selectedTreeIdAtom);

  if (trees.length === 0) return null;

  return (
    <>
      {trees.map((tree) => (
        <TreeMesh
          key={tree.id}
          tree={tree}
          isSelected={selectedId === tree.id}
          showGroundCircle={showGroundCircle}
          compactCanopy={compactCanopy}
        />
      ))}
    </>
  );
}

/**
 * Renders trees as dark green circles for the top-down (2D) view overlay.
 * This is used on the main canvas to match the reference visual.
 */
export function TreeCircles() {
  const trees = useAtomValue(trees3DAtom);
  const selectedId = useAtomValue(selectedTreeIdAtom);

  if (trees.length === 0) return null;

  return (
    <>
      {trees.map((tree) => (
        <TreeCircle
          key={tree.id}
          tree={tree}
          isSelected={selectedId === tree.id}
        />
      ))}
    </>
  );
}

function TreeCircle({
  tree,
  isSelected,
}: {
  tree: Tree3D;
  isSelected: boolean;
}) {
  const dragHandlers = useTreeDragHandlers(tree);

  return (
    <mesh
      position={[tree.position[0], 0.1, tree.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      {...dragHandlers}
    >
      <circleGeometry args={[tree.radius, 32]} />
      <meshBasicMaterial
        color={isSelected ? "#4CAF50" : tree.color}
        transparent
        opacity={0.7}
      />
      {}
      <mesh>
        <ringGeometry args={[tree.radius - 0.08, tree.radius, 32]} />
        <meshBasicMaterial color="#1B5E20" />
      </mesh>
    </mesh>
  );
}

