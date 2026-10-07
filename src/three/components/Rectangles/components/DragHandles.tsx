import { useState } from "react";
import type { Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";

const HANDLE_RADIUS = 0.1;
const HANDLE_HOVER_RADIUS = HANDLE_RADIUS * 1.4;

interface DragHandlesProps {
  startPt: Vector3;
  endPt: Vector3;
  mergeStart?: boolean;
  mergeEnd?: boolean;
  rectId: string;
  onHandlePointerDown: (
    e: ThreeEvent<PointerEvent>,
    rectId: string,
    handle: "start" | "end",
  ) => void;
}

const DragHandles = ({
  startPt,
  endPt,
  mergeStart,
  mergeEnd,
  rectId,
  onHandlePointerDown,
}: DragHandlesProps) => {
  const [hovered, setHovered] = useState<"start" | "end" | null>(null);

  return (
    <>
      <mesh
        position={startPt}
        onPointerDown={(e) => onHandlePointerDown(e, rectId, "start")}
        onPointerEnter={() => setHovered("start")}
        onPointerLeave={() => setHovered(null)}
      >
        <sphereGeometry
          args={[
            hovered === "start" ? HANDLE_HOVER_RADIUS : HANDLE_RADIUS,
            16,
            16,
          ]}
        />
        <meshStandardMaterial
          color={mergeStart ? "#00ff88" : "#ffcc00"}
          emissive={hovered === "start" ? "#ff8800" : "#664400"}
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh
        position={endPt}
        onPointerDown={(e) => onHandlePointerDown(e, rectId, "end")}
        onPointerEnter={() => setHovered("end")}
        onPointerLeave={() => setHovered(null)}
      >
        <sphereGeometry
          args={[
            hovered === "end" ? HANDLE_HOVER_RADIUS : HANDLE_RADIUS,
            16,
            16,
          ]}
        />
        <meshStandardMaterial
          color={mergeEnd ? "#00ff88" : "#ffcc00"}
          emissive={hovered === "end" ? "#ff8800" : "#664400"}
          emissiveIntensity={0.5}
        />
      </mesh>
    </>
  );
};

export default DragHandles;
