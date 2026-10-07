import { useState } from "react";
import type { Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";

const HANDLE_SIZE = 0.08;
const HANDLE_HOVER_SIZE = HANDLE_SIZE * 1.4;

interface WidthHandlesProps {
  widthLeft: Vector3;
  widthRight: Vector3;
  rectId: string;
  onWidthHandlePointerDown: (
    e: ThreeEvent<PointerEvent>,
    rectId: string,
    side: "left" | "right",
  ) => void;
}

const WidthHandles = ({
  widthLeft,
  widthRight,
  rectId,
  onWidthHandlePointerDown,
}: WidthHandlesProps) => {
  const [hovered, setHovered] = useState<"left" | "right" | null>(null);

  return (
    <>
      <mesh
        position={widthLeft}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => onWidthHandlePointerDown(e, rectId, "left")}
        onPointerEnter={() => setHovered("left")}
        onPointerLeave={() => setHovered(null)}
      >
        <boxGeometry
          args={[
            hovered === "left" ? HANDLE_HOVER_SIZE : HANDLE_SIZE,
            hovered === "left" ? HANDLE_HOVER_SIZE : HANDLE_SIZE,
            0.02,
          ]}
        />
        <meshStandardMaterial
          color="#88aaff"
          emissive={hovered === "left" ? "#4466ff" : "#223388"}
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh
        position={widthRight}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => onWidthHandlePointerDown(e, rectId, "right")}
        onPointerEnter={() => setHovered("right")}
        onPointerLeave={() => setHovered(null)}
      >
        <boxGeometry
          args={[
            hovered === "right" ? HANDLE_HOVER_SIZE : HANDLE_SIZE,
            hovered === "right" ? HANDLE_HOVER_SIZE : HANDLE_SIZE,
            0.02,
          ]}
        />
        <meshStandardMaterial
          color="#88aaff"
          emissive={hovered === "right" ? "#4466ff" : "#223388"}
          emissiveIntensity={0.5}
        />
      </mesh>
    </>
  );
};

export default WidthHandles;
