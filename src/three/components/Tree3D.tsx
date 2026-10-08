import { useMemo, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import pineTreeModelUrl from "../../assets/models/tree_small_02_solarjiji_optimized_final.glb?url";
import jacarandaTreeModelUrl from "../../assets/models/jacaranda_tree_solarjiji_optimized.glb?url";
import {
  trees3DAtom,
  selectedTreeIdAtom,
  selectedRectangleIdAtom,
  selectedChimneyIdAtom,
  interactionModeAtom,
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

  const dragOffsetRef = useRef<{ x: number; z: number } | null>(null);
  const didMoveRef = useRef(false);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {


    // While drawing, clicks are placement clicks. Never select an existing
    // tree underneath the cursor; the ground handler owns the draw workflow.
    if (mode === "draw") return;

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
  const modelUrl = tree.model === "jacaranda" ? jacarandaTreeModelUrl : pineTreeModelUrl;
  const { scene } = useGLTF(modelUrl);
  const dragHandlers = useTreeDragHandlers(tree);


  const treeModel = useMemo(() => {
    const model = scene.clone(true);
    model.updateMatrixWorld(true);

    model.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;

      const mesh = object as THREE.Mesh;
      mesh.visible = true;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      mesh.renderOrder = 0;

      if (mesh.geometry && !mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }

      const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const materialName = sourceMaterial?.name?.toLowerCase() ?? "";
      const foliage = materialName.includes("leaf") || materialName.includes("leaves");
      const trunk = materialName.includes("trunk");
      const foliageColor = new THREE.Color(tree.color);

      const material = new THREE.MeshBasicMaterial({
        color: foliage
          ? foliageColor
          : trunk
            ? foliageColor.clone().multiplyScalar(0.58)
            : foliageColor.clone().multiplyScalar(0.72),
        side: foliage ? THREE.DoubleSide : THREE.FrontSide,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        depthTest: true,
      });

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(() => material.clone());
      } else {
        mesh.material = material;
      }
    });

    return model;
  }, [scene, tree.color]);

  const modelBounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(treeModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return { size, center, minY: box.min.y };
  }, [treeModel]);

  const modelScale = useMemo(() => {
    const sourceWidth = Math.max(modelBounds.size.x, 0.001);
    const sourceDepth = Math.max(modelBounds.size.z, 0.001);
    const sourceHeight = Math.max(modelBounds.size.y, 0.001);
    const targetDiameter = Math.max(tree.radius * (compactCanopy ? 1.1 : 2), 0.01);
    const targetHeight = Math.max(tree.height, 0.01);
    const horizontalScale = targetDiameter / Math.max(sourceWidth, sourceDepth);
    const verticalScale = targetHeight / sourceHeight;
    return [horizontalScale, verticalScale, horizontalScale] as [number, number, number];
  }, [modelBounds.size.x, modelBounds.size.y, modelBounds.size.z, tree.height, tree.radius, compactCanopy]);

  const footprintRadius = Math.max(tree.radius, 0.03);
  const footprintInnerRadius = Math.max(footprintRadius - 0.04, footprintRadius * 0.7);

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

      <primitive
        object={treeModel}
        scale={modelScale}
        position={[
          -modelBounds.center.x * modelScale[0],
          -modelBounds.minY * modelScale[1],
          -modelBounds.center.z * modelScale[2],
        ]}
      />

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


useGLTF.preload(pineTreeModelUrl);
useGLTF.preload(jacarandaTreeModelUrl);
