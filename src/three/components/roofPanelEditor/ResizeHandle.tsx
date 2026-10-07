import type { ManualPanel2D } from "../../store/solarPanelStore";

export type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export type EditorMode = "select" | "draw" | "polygon";

interface ResizeHandleProps {
  panel: ManualPanel2D;
  dir: ResizeDir;
  scale: number;
  worldToSvg: (wx: number, wy: number) => { x: number; y: number };
  onResizeStart: (
    panelId: string,
    dir: ResizeDir,
    e: React.PointerEvent,
  ) => void;
}

export function ResizeHandle({
  panel,
  dir,
  scale,
  worldToSvg,
  onResizeStart,
}: ResizeHandleProps) {
  const hw = panel.width / 2;
  const hh = panel.height / 2;
  let dx = 0,
    dy = 0;
  if (dir.includes("e")) dx = hw;
  if (dir.includes("w")) dx = -hw;
  if (dir.includes("s")) dy = hh;
  if (dir.includes("n")) dy = -hh;

  const pos = worldToSvg(panel.x + dx, panel.y + dy);
  const handleSize = 6 / scale;

  let cursor = "default";
  if (dir === "n" || dir === "s") cursor = "ns-resize";
  else if (dir === "e" || dir === "w") cursor = "ew-resize";
  else if (dir === "ne" || dir === "sw") cursor = "nwse-resize";
  else if (dir === "nw" || dir === "se") cursor = "nesw-resize";

  return (
    <rect
      x={pos.x - handleSize / 2}
      y={pos.y - handleSize / 2}
      width={handleSize}
      height={handleSize}
      fill="#fff"
      stroke="#1565c0"
      strokeWidth={1 / scale}
      style={{ cursor }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onResizeStart(panel.id, dir, e);
      }}
    />
  );
}
