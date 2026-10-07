import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";

const vertexShader =  `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader =  `
  uniform vec3 cellColor;
  uniform vec3 gridColor;
  uniform vec3 cornerColor;
  uniform float cellsX;
  uniform float cellsY;
  uniform float gridLineWidth;
  uniform float cornerRadius;
  uniform float busbarsPerCell;
  uniform float roughness;
  uniform float metalness;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  float roundedRectSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 uv = vUv;

    vec2 cellUv = uv * vec2(cellsX, cellsY);
    vec2 cellId = floor(cellUv);
    vec2 cellLocalUv = fract(cellUv);

    vec2 centered = cellLocalUv - 0.5;

    float cellInset = gridLineWidth * 0.5;
    vec2 cellSize = vec2(0.5 - cellInset);

    float cellSDF = roundedRectSDF(centered, cellSize, cornerRadius);
    float cellMask = 1.0 - smoothstep(-0.01, 0.01, cellSDF);

    float cornerCut = 0.0;
    float cutSize = 0.08;
    if (cellLocalUv.x < cutSize && cellLocalUv.y > 1.0 - cutSize) {
      cornerCut = step(cellLocalUv.x + (1.0 - cellLocalUv.y), cutSize);
    }
    if (cellLocalUv.x > 1.0 - cutSize && cellLocalUv.y > 1.0 - cutSize) {
      cornerCut = max(cornerCut, step((1.0 - cellLocalUv.x) + (1.0 - cellLocalUv.y), cutSize));
    }
    if (cellLocalUv.x < cutSize && cellLocalUv.y < cutSize) {
      cornerCut = max(cornerCut, step(cellLocalUv.x + cellLocalUv.y, cutSize));
    }
    if (cellLocalUv.x > 1.0 - cutSize && cellLocalUv.y < cutSize) {
      cornerCut = max(cornerCut, step((1.0 - cellLocalUv.x) + cellLocalUv.y, cutSize));
    }

    float busbarWidth = 0.012;
    float busbarSpacing = 1.0 / (busbarsPerCell + 1.0);
    float busbarPattern = 0.0;
    for (float i = 1.0; i <= 6.0; i++) {
      if (i > busbarsPerCell) break;
      float busbarX = i * busbarSpacing;
      float dist = abs(cellLocalUv.x - busbarX);
      busbarPattern = max(busbarPattern, 1.0 - smoothstep(0.0, busbarWidth, dist));
    }

    float fingerSpacing = 0.04;
    float fingerWidth = 0.003;
    float fingerPattern = 0.0;
    float fingerY = mod(cellLocalUv.y, fingerSpacing);
    fingerPattern = 1.0 - smoothstep(0.0, fingerWidth, abs(fingerY - fingerSpacing * 0.5));
    fingerPattern *= 0.3;

    float cellVariation = fract(sin(dot(cellId, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 cellColorVaried = cellColor * (0.92 + cellVariation * 0.16);

    float shimmer = sin(cellLocalUv.x * 150.0) * sin(cellLocalUv.y * 150.0) * 0.03;
    cellColorVaried *= (1.0 + shimmer);

    vec3 color = gridColor;

    color = mix(gridColor, cellColorVaried, cellMask * (1.0 - cornerCut));

    color = mix(color, cornerColor, cornerCut * cellMask);

    vec3 busbarColor = vec3(0.85, 0.87, 0.9);
    color = mix(color, busbarColor, busbarPattern * cellMask * (1.0 - cornerCut) * 0.9);

    color = mix(color, busbarColor, fingerPattern * cellMask * (1.0 - cornerCut));

    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);

    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 64.0);

    vec3 finalColor = color;

    finalColor += vec3(0.4, 0.5, 0.6) * fresnel * 0.2;
    finalColor += vec3(1.0) * spec * 0.1;

    finalColor = mix(finalColor, vec3(0.6, 0.75, 0.9), fresnel * 0.1);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const SolarPanelShaderMaterial = shaderMaterial(
  {
    cellColor: new THREE.Color(0x1a237e),
    gridColor: new THREE.Color(0xe8e8e8),
    cornerColor: new THREE.Color(0x1a237e),
    cellsX: 6,
    cellsY: 10,
    gridLineWidth: 0.04,
    cornerRadius: 0.02,
    roughness: 0.1,
    metalness: 0.3,
  },
  vertexShader,
  fragmentShader,
);

export function calculateCellCount(
  width: number,
  height: number,
  targetCellSize: number = 0.156,
): { cellsX: number; cellsY: number } {
  const cellsX = Math.max(1, Math.round(width / targetCellSize));
  const cellsY = Math.max(1, Math.round(height / targetCellSize));
  return { cellsX, cellsY };
}
