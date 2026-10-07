import type { Object3DNode } from "@react-three/fiber";
import type { ShaderMaterial } from "three";

export interface SolarPanelShaderMaterialProps {
  cellColor?: THREE.Color;
  gridColor?: THREE.Color;
  cornerColor?: THREE.Color;
  cellsX?: number;
  cellsY?: number;
  gridLineWidth?: number;
  cornerRadius?: number;
  busbarsPerCell?: number;
  roughness?: number;
  metalness?: number;
  side?: THREE.Side;
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    solarPanelShaderMaterial: Object3DNode<ShaderMaterial, typeof ShaderMaterial> &
      SolarPanelShaderMaterialProps;
  }
}
