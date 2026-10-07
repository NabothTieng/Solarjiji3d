import { Line, Edges } from "@react-three/drei";
import { DoubleSide, type BufferGeometry, type Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";

interface RoofBodyProps {
  geometry: BufferGeometry;
  color: string;
  isSelected: boolean;
  outlinePoints: Vector3[];
  startPt: Vector3;
  endPt: Vector3;
  isPolygonFootprint: boolean;
  rectId: string;
  onRectPointerDown: (e: ThreeEvent<PointerEvent>, rectId: string) => void;
}

const RoofBody = ({
  geometry,
  color,
  isSelected,
  outlinePoints,
  startPt,
  endPt,
  isPolygonFootprint,
  rectId,
  onRectPointerDown,
}: RoofBodyProps) => {
  const lineColor = isSelected ? "#ff6600" : "#cccccc";

  return (
    <>
      <mesh
        geometry={geometry}
        onPointerDown={(e) => onRectPointerDown(e, rectId)}
      >
        <meshStandardMaterial
          color={color}
          side={DoubleSide}
          transparent
          opacity={isSelected ? 0.85 : 0.6}
        />
        <Edges
          threshold={1}
          color={isSelected ? "#ff6600" : "#444444"}
          lineWidth={isSelected ? 2 : 1}
        />
      </mesh>

      {isSelected && (
        <Line points={outlinePoints} color="#ff6600" lineWidth={2} />
      )}

      {!isPolygonFootprint && (
        <Line
          points={[startPt, endPt]}
          color={lineColor}
          lineWidth={isSelected ? 3 : 1.5}
        />
      )}
    </>
  );
};

export default RoofBody;
