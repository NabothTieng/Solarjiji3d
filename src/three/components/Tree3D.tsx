import { useEffect, useMemo, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import treeModelUrl from "../../assets/models/tree_small_02_solarjiji_optimized_normals.glb?url";
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
  const { scene } = useGLTF(treeModelUrl);
  const dragHandlers = useTreeDragHandlers(tree);

  useEffect(() => {
    console.groupCollapsed(`[SolarJiji Tree Debug] Tree ${tree.id}`);
    console.log("tree data", {
      id: tree.id,
      position: tree.position,
      radius: tree.radius,
      height: tree.height,
      isSelected,
      showGroundCircle,
      compactCanopy,
    });
    console.log("GLB scene loaded", scene);

    let meshCount = 0;
    let triangleCount = 0;
    scene.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      meshCount += 1;
      const index = mesh.geometry.index;
      const triangles = index
        ? index.count / 3
        : (mesh.geometry.attributes.position?.count ?? 0) / 3;
      triangleCount += triangles;
      console.log("GLB mesh", {
        name: mesh.name,
        visible: mesh.visible,
        renderOrder: mesh.renderOrder,
        frustumCulled: mesh.frustumCulled,
        castShadow: mesh.castShadow,
        receiveShadow: mesh.receiveShadow,
        position: mesh.position.toArray(),
        scale: mesh.scale.toArray(),
        geometry: {
          vertices: mesh.geometry.attributes.position?.count,
          triangles,
          hasNormal: !!mesh.geometry.attributes.normal,
          hasUv: !!mesh.geometry.attributes.uv,
          hasIndex: !!index,
        },
        material: Array.isArray(mesh.material)
          ? mesh.material.map((m) => ({ name: m.name, type: m.type }))
          : { name: mesh.material?.name, type: mesh.material?.type },
      });
    });
    console.log("GLB summary", { meshCount, triangleCount });

    const localBox = new THREE.Box3().setFromObject(scene);
    const localSphere = localBox.getBoundingSphere(new THREE.Sphere());
    console.log("GLB bounds", {
      min: localBox.min.toArray(),
      max: localBox.max.toArray(),
      size: localBox.getSize(new THREE.Vector3()).toArray(),
      center: localBox.getCenter(new THREE.Vector3()).toArray(),
      radius: localSphere.radius,
    });
    console.groupEnd();
  }, [scene, tree.id, tree.position, tree.radius, tree.height, isSelected, showGroundCircle, compactCanopy]);

  const treeModel = useMemo(() => {
    const model = scene.clone(true);

    model.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;

      const mesh = object as THREE.Mesh;
      mesh.visible = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.renderOrder = 1;

      if (mesh.geometry && !mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }

      const makeDebugMaterial = (material: THREE.Material) => {
        const name = material.name.toLowerCase();
        const color = name.includes("leaf")
          ? "#2f6b2f"
          : name.includes("trunk")
            ? "#6b4935"
            : "#5a4a3a";

        return new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1,
          alphaTest: 0,
          depthWrite: true,
          depthTest: true,
        });
      };

      // IMPORTANT: keep a single material as a single material. Three.js
      // treats an array of materials as a multi-material mesh and renders it
      // through geometry.groups. These GLB primitives have no groups, so
      // replacing a single material with [material] can result in no draw.
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(makeDebugMaterial);
      } else {
        mesh.material = makeDebugMaterial(mesh.material);
      }

      console.log("[SolarJiji Tree Debug] render material", {
        name: mesh.name,
        materialIsArray: Array.isArray(mesh.material),
        geometryGroupCount: mesh.geometry.groups.length,
        visible: mesh.visible,
        frustumCulled: mesh.frustumCulled,
        castShadow: mesh.castShadow,
      });
    });

    // The optimized asset has a stable source-space size. Using these source
    // dimensions avoids depending on Box3/matrix-world timing during render.
    // The model's lowest vertex is about -0.024 m, so lift it by that amount.
    model.position.y = 0.024032;
    model.updateMatrixWorld(true);
    model.visible = true;

    const debugBox = new THREE.Box3().setFromObject(model);
    console.log("[SolarJiji Tree Debug] cloned model bounds", {
      min: debugBox.min.toArray(),
      max: debugBox.max.toArray(),
      size: debugBox.getSize(new THREE.Vector3()).toArray(),
      position: model.position.toArray(),
      visible: model.visible,
    });

    return model;
  }, [scene]);

  const modelScale = useMemo(() => {
    const sourceWidth = 2.913641;
    const sourceDepth = 4.286005;
    const sourceHeight = 4.555604;
    const targetDiameter = Math.max(
      tree.radius * (compactCanopy ? 1.1 : 2),
      0.01,
    );
    const targetHeight = Math.max(tree.height, 0.01);

    const horizontalScale = targetDiameter / Math.max(sourceWidth, sourceDepth);
    const verticalScale = targetHeight / sourceHeight;

    const result = [horizontalScale, verticalScale, horizontalScale] as [number, number, number];
    console.log("[SolarJiji Tree Debug] computed model scale", {
      treeId: tree.id,
      sourceWidth,
      sourceDepth,
      sourceHeight,
      targetDiameter,
      targetHeight,
      scale: result,
    });
    return result;
  }, [tree.height, tree.radius, compactCanopy]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      console.error("[SolarJiji Tree Debug] Tree group ref is null", tree.id);
      return;
    }

    group.updateWorldMatrix(true, true);
    const worldBox = new THREE.Box3().setFromObject(group);
    console.log("[SolarJiji Tree Debug] mounted group", {
      treeId: tree.id,
      childCount: group.children.length,
      children: group.children.map((child) => ({
        type: child.type,
        name: child.name,
        visible: child.visible,
        position: child.position.toArray(),
        scale: child.scale.toArray(),
      })),
      worldBounds: {
        min: worldBox.min.toArray(),
        max: worldBox.max.toArray(),
        size: worldBox.getSize(new THREE.Vector3()).toArray(),
      },
    });
  }, [tree.id, tree.position, modelScale, treeModel]);

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
        position={[0, 0, 0]}
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

  useEffect(() => {
    console.log("[SolarJiji Tree Debug] Trees3D atom changed", {
      count: trees.length,
      selectedId,
      trees: trees.map((tree) => ({
        id: tree.id,
        position: tree.position,
        radius: tree.radius,
        height: tree.height,
      })),
    });
  }, [trees, selectedId]);

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


useGLTF.preload(treeModelUrl);
