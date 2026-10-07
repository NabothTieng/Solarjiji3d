import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import CameraController from "./cameraController/CameraController";
import { DrawingController } from "../components/DrawingController";
import { InteractiveScene } from "../components/InteractiveScene";
import { Chimneys3D } from "../components/Chimney3D";
import { Trees3D, TreeCircles } from "../components/Tree3D";
import { Lots3D } from "../components/Lot3D";
import { SolarPanelOverlay2D } from "../components/SolarPanelOverlay2D";
import { SceneLighting } from "./components/SceneLighting";

const TopPlanViewer = () => {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      style={{
        height: "100%",
        width: "100%",
        background: "transparent",
      }}
      camera={{ position: [0, 10, 0], fov: 55, far: 1000, near: 0.01 }}
      gl={{
        powerPreference: "high-performance",
        antialias: true,
        alpha: true,
      }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1} />
        <SceneLighting />
        <CameraController />
        <InteractiveScene />
        <Lots3D />
        <Chimneys3D />
        <TreeCircles />
        <Trees3D />
        <SolarPanelOverlay2D />
        <DrawingController />
      </Suspense>
    </Canvas>
  );
};

export default TopPlanViewer;
