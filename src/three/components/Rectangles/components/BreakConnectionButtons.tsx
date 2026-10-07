import { useState } from "react";
import { Line } from "@react-three/drei";
import { Vector3 } from "three";

const BREAK_ICON_SIZE = 0.08;
const BREAK_ICON_HOVER_SIZE = BREAK_ICON_SIZE * 1.3;

interface BreakButtonProps {
  position: Vector3;
  onBreak: () => void;
}

const BreakButton = ({ position, onBreak }: BreakButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const size = hovered ? BREAK_ICON_HOVER_SIZE : BREAK_ICON_SIZE;

  return (
    <group position={position}>
      <mesh
        rotation={[-Math.PI / 2, Math.PI / 4, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onBreak();
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <circleGeometry args={[size, 16]} />
        <meshStandardMaterial
          color="#ff4444"
          emissive={hovered ? "#ff2222" : "#661111"}
          emissiveIntensity={0.6}
        />
      </mesh>
      <Line
        points={[
          new Vector3(-BREAK_ICON_SIZE * 0.5, 0.01, -BREAK_ICON_SIZE * 0.5),
          new Vector3(BREAK_ICON_SIZE * 0.5, 0.01, BREAK_ICON_SIZE * 0.5),
        ]}
        color="#ffffff"
        lineWidth={2}
      />
      <Line
        points={[
          new Vector3(-BREAK_ICON_SIZE * 0.5, 0.01, BREAK_ICON_SIZE * 0.5),
          new Vector3(BREAK_ICON_SIZE * 0.5, 0.01, -BREAK_ICON_SIZE * 0.5),
        ]}
        color="#ffffff"
        lineWidth={2}
      />
    </group>
  );
};

interface BreakConnectionButtonsProps {
  breakStartPos: Vector3;
  breakEndPos: Vector3;
  mergeStart: boolean;
  mergeEnd: boolean;
  rectId: string;
  onBreakConnection: (rectId: string, end: "start" | "end") => void;
}

const BreakConnectionButtons = ({
  breakStartPos,
  breakEndPos,
  mergeStart,
  mergeEnd,
  rectId,
  onBreakConnection,
}: BreakConnectionButtonsProps) => (
  <>
    {mergeStart && (
      <BreakButton
        position={breakStartPos}
        onBreak={() => onBreakConnection(rectId, "start")}
      />
    )}
    {mergeEnd && (
      <BreakButton
        position={breakEndPos}
        onBreak={() => onBreakConnection(rectId, "end")}
      />
    )}
  </>
);

export default BreakConnectionButtons;
