import { useState } from "react";
import { Line } from "@react-three/drei";
import type { Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";

interface RotateHandleProps {
  rotateHandlePos: Vector3;
  rotateLinePoints: [Vector3, Vector3];
  rotateTorusRadius: number;
  rectId: string;
  onRotateHandlePointerDown: (
    e: ThreeEvent<PointerEvent>,
    rectId: string,
  ) => void;
}

const RotateHandle = ({
  rotateHandlePos,
  rotateLinePoints,
  rotateTorusRadius,
  rectId,
  onRotateHandlePointerDown,
}: RotateHandleProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Line points={rotateLinePoints} color="#44cc88" lineWidth={1.5} />
      <mesh
        position={rotateHandlePos}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => onRotateHandlePointerDown(e, rectId)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry
          args={[
            hovered ? rotateTorusRadius * 1.25 : rotateTorusRadius,
            16,
            16,
          ]}
        />
        <meshStandardMaterial
          color="#44cc88"
          emissive={hovered ? "#22aa66" : "#115533"}
          emissiveIntensity={0.5}
        />
      </mesh>
    </>
  );
};

export default RotateHandle;
