import { useState } from "react";
import type { Vector3 } from "three";
import type { EndCapType } from "../../../store/rectangleStore";

const CAP_ICON_SIZE = 0.07;
const CAP_ICON_HOVER_SIZE = CAP_ICON_SIZE * 1.4;

interface CapToggleProps {
  position: Vector3;
  capType: EndCapType;
  onToggle: () => void;
}

const CapToggle = ({ position, capType, onToggle }: CapToggleProps) => {
  const [hovered, setHovered] = useState(false);
  const size = hovered ? CAP_ICON_HOVER_SIZE : CAP_ICON_SIZE;

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, Math.PI / 4, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <boxGeometry args={[size, size, 0.02]} />
      <meshStandardMaterial
        color={capType === "pointed" ? "#ff8844" : "#aaaaaa"}
        emissive={hovered ? "#ff6600" : "#333333"}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

interface CapTogglesProps {
  capStartPos: Vector3;
  capEndPos: Vector3;
  startCap: EndCapType;
  endCap: EndCapType;
  mergeStart: boolean;
  mergeEnd: boolean;
  rectId: string;
  onToggleCap: (rectId: string, end: "start" | "end") => void;
}

const CapToggles = ({
  capStartPos,
  capEndPos,
  startCap,
  endCap,
  mergeStart,
  mergeEnd,
  rectId,
  onToggleCap,
}: CapTogglesProps) => (
  <>
    {!mergeStart && (
      <CapToggle
        position={capStartPos}
        capType={startCap}
        onToggle={() => onToggleCap(rectId, "start")}
      />
    )}
    {!mergeEnd && (
      <CapToggle
        position={capEndPos}
        capType={endCap}
        onToggle={() => onToggleCap(rectId, "end")}
      />
    )}
  </>
);

export default CapToggles;
