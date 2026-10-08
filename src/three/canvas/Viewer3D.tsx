import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import * as THREE from "three";
import {
  fullscreenViewAtom,
  mapCenterAtom,
  computeMetersPerPixel,
  worldOffsetToGeo,
  INITIAL_MAP_ZOOM,
  INITIAL_ORTHO_ZOOM,
  worldOriginGeoAtom,
} from "../../store/atoms";
import { rectanglesAtom } from "../store/rectangleStore";
import {
  activeToolAtom,
  interactionModeAtom,
  isDraggingHandleAtom,
} from "../store/rectangleStore";
import { Trees3D } from "../components/Tree3D";
import { Chimneys3D } from "../components/Chimney3D";
import { Lots3D } from "../components/Lot3D";
import { InteractiveScene } from "../components/InteractiveScene";
import { BuildingRenderer } from "./components/BuildingRenderer";
import { SceneLighting } from "./components/SceneLighting";
import { ViewerHeader } from "./components/ViewerHeader";
import { ViewerShell } from "./components/ViewerShell";
import { FullscreenToggle } from "./components/FullscreenToggle";


function Viewer3DMapSync({ enabled }: { enabled: boolean }) {
  const setMapCenter = useSetAtom(mapCenterAtom);
  const worldOriginGeo = useAtomValue(worldOriginGeoAtom);
  const { controls } = useThree();

  const lastPushed = useRef({ lat: 0, lng: 0 });
  const worldOriginRef = useRef(worldOriginGeo);

  useEffect(() => {
    worldOriginRef.current = worldOriginGeo;
  }, [worldOriginGeo]);

  useFrame(() => {
    if (!enabled || !controls) return;
    const target = (controls as unknown as { target: THREE.Vector3 }).target;
    const anchor = worldOriginRef.current;


    const metersPerWorldUnit =
      INITIAL_ORTHO_ZOOM * computeMetersPerPixel(INITIAL_MAP_ZOOM, anchor.lat);
    const { lat: newLat, lng: newLng } = worldOffsetToGeo(
      anchor,
      target.x * metersPerWorldUnit,
      target.z * metersPerWorldUnit,
    );

    const prev = lastPushed.current;
    if (
      Math.abs(prev.lat - newLat) > 1e-8 ||
      Math.abs(prev.lng - newLng) > 1e-8
    ) {
      lastPushed.current = { lat: newLat, lng: newLng };
      setMapCenter({ lat: newLat, lng: newLng });
    }
  });

  return null;
}

const Viewer3D = () => {
  const rectangles = useAtomValue(rectanglesAtom);
  const [fullscreenView, setFullscreenView] = useAtom(fullscreenViewAtom);
  const mode = useAtomValue(interactionModeAtom);
  const activeTool = useAtomValue(activeToolAtom);
  const isDraggingHandle = useAtomValue(isDraggingHandleAtom);
  const isDrawingFootprint =
    mode === "draw" &&
    ["draw", "flat", "hip", "shed", "lot", "polygon", "polygon-lot"].includes(
      activeTool,
    );
  const orbitEnabled = !isDrawingFootprint && !isDraggingHandle;


  const center = useMemo(() => {
    if (rectangles.length === 0) return [0, 0, 0] as [number, number, number];
    let cx = 0,
      cz = 0;
    let count = 0;
    for (const r of rectangles) {
      cx += (r.start[0] + r.end[0]) / 2;
      cz += (r.start[2] + r.end[2]) / 2;
      count++;
    }
    return [cx / count, 0, cz / count] as [number, number, number];
  }, [rectangles]);


  const cameraPosition = useMemo(() => {
    if (rectangles.length === 0) return [5, 5, 5] as [number, number, number];

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const r of rectangles) {
      const halfD = r.depth / 2;
      for (const pt of [r.start, r.end]) {
        minX = Math.min(minX, pt[0] - halfD);
        maxX = Math.max(maxX, pt[0] + halfD);
        minZ = Math.min(minZ, pt[2] - halfD);
        maxZ = Math.max(maxZ, pt[2] + halfD);
      }
    }

    const rangeX = maxX - minX;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeZ, 2);
    const dist = maxRange * 1.2;

    return [center[0] + dist, dist * 0.8, center[2] + dist] as [
      number,
      number,
      number,
    ];
  }, [rectangles, center]);

  return (
    <ViewerShell>
      <ViewerHeader title="3D View">
        <FullscreenToggle
          isFullscreen={fullscreenView === "3d"}
          onToggle={() =>
            setFullscreenView(fullscreenView === "3d" ? null : "3d")
          }
        />
      </ViewerHeader>

      <div
        style={{ width: "100%", flex: 1, minHeight: 0, background: "#ffffff" }}
      >
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          camera={{
            position: cameraPosition,
            fov: 50,
            near: 0.1,
            far: 500,
          }}
          gl={{
            powerPreference: "high-performance",
            antialias: true,
          }}
          dpr={[1, 2]}
          style={{ width: "100%", height: "100%" }}
          onCreated={({ gl, scene, camera }) => {
            console.group("[SolarJiji 3D Debug] Canvas created");
            console.log("renderer", {
              renderer: gl.info.render,
              memory: gl.info.memory,
              capabilities: gl.capabilities,
              outputColorSpace: gl.outputColorSpace,
              toneMapping: gl.toneMapping,
            });
            console.log("scene", scene);
            console.log("camera", camera);
            console.log("camera position", camera.position.toArray());
            console.groupEnd();

            const canvas = gl.domElement;
            canvas.addEventListener("webglcontextlost", (event) => {
              console.error("[SolarJiji 3D Debug] WEBGL CONTEXT LOST", event);
            });
            canvas.addEventListener("webglcontextrestored", () => {
              console.warn("[SolarJiji 3D Debug] WEBGL CONTEXT RESTORED");
            });
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <SceneLighting shadowSize={50} />
            <hemisphereLight
              color="#b1e1ff"
              groundColor="#444444"
              intensity={0.3}
            />

            <OrbitControls
              makeDefault
              target={center}
              enabled={orbitEnabled}
              enableDamping
              dampingFactor={0.1}
              minDistance={1}
              maxDistance={100}
            />

            <Viewer3DMapSync
              enabled={fullscreenView === "3d" && activeTool === "pan"}
            />

            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[center[0], -0.05, center[2]]}
              receiveShadow
            >
              <planeGeometry args={[500, 500]} />
              <meshStandardMaterial
                color="#e8e8e8"
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            </mesh>

            <Grid
              position={[center[0], 0, center[2]]}
              args={[100, 100]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#cccccc"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#aaaaaa"
              fadeDistance={50}
              fadeStrength={1}
              infiniteGrid
            />

            <BuildingRenderer rectangles={rectangles} enableRoofDrag />
            <Lots3D />
            <Chimneys3D interactive={false} />
            <Trees3D showGroundCircle compactCanopy />
            <InteractiveScene
              renderRectangles={false}
              renderControls
              controlsOnRoof
            />
          </Suspense>
        </Canvas>
      </div>
    </ViewerShell>
  );
};

export default Viewer3D;
