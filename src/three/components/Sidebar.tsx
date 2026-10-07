import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import {
  interactionModeAtom,
  activeToolAtom,
} from "../store/rectangleStore";

import { panelReportOpenAtom } from "../store/solarPanelStore";
import {
  FileText,
  Grid2x2,
  Home,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Sun,
  TreePine,
  Undo2,
} from "lucide-react";
import {
  canRedoAtom,
  canUndoAtom,
  redoAtom,
  undoAtom,
} from "../store/historyStore";
import { activePanelAtom } from "../../store/atoms";
import { useSaveHandler } from "../../context/SaveHandlerContext";
import { useCollectPlannerData } from "../../hooks/useCollectPlannerData";


interface ToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  action?: () => void;
  danger?: boolean;
}

interface ToolSection {
  title: string;
  items: ToolItem[];
}


const sidebarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  width: "clamp(4rem, 5vw, 4.5rem)",
  background: "rgba(40, 40, 50, 0.95)",
  backdropFilter: "blur(8px)",
  display: "flex",
  flexDirection: "column",
  zIndex: 200,
  overflow: "visible",
  borderRight: "0.0625rem solid rgba(255,255,255,0.08)",
};

const sectionTitleStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "clamp(0.5rem, 0.65vw, 0.6rem)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06rem",
  padding: "clamp(0.45rem, 1vh, 0.65rem) 0 clamp(0.15rem, 0.4vh, 0.3rem)",
  textAlign: "center",
  userSelect: "none",
};

const btnBase: React.CSSProperties = {
  width: "calc(100% - clamp(0.5rem, 1vw, 0.75rem))",
  height: "clamp(2.8rem, 6vh, 3.5rem)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "clamp(0.1rem, 0.25vh, 0.2rem)",
  borderRadius: "clamp(0.3rem, 0.5vw, 0.45rem)",
  border: "none",
  cursor: "pointer",
  transition: "background 0.15s, box-shadow 0.15s",
  background: "transparent",
  color: "#ccc",
  fontSize: "clamp(1rem, 1.8vw, 1.25rem)",
  margin: "clamp(0.08rem, 0.25vh, 0.15rem) auto",
  padding: "clamp(0.18rem, 0.45vh, 0.3rem) 0",
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "rgba(255,160,0,0.25)",
  boxShadow: "0 0 0 0.125rem rgba(255,160,0,0.6)",
  color: "#ffa500",
};

const paletteBtnBase: React.CSSProperties = {
  ...btnBase,
  height: "clamp(2.1rem, 4.5vh, 2.65rem)",
  padding: "clamp(0.14rem, 0.34vh, 0.225rem) 0",
};

const paletteBtnActive: React.CSSProperties = {
  ...paletteBtnBase,
  background: "rgba(255,160,0,0.25)",
  boxShadow: "0 0 0 0.125rem rgba(255,160,0,0.6)",
  color: "#ffa500",
};

const btnLabelStyle: React.CSSProperties = {
  fontSize: "clamp(0.45rem, 0.6vw, 0.55rem)",
  fontWeight: 600,
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: "0.03rem",
  marginTop: "0.06rem",
};


const ICON_SIZE = "clamp(1rem, 1.8vw, 1.5rem)";
const ICON_STROKE = 1.5;

const MiscIcons = {
  tree: <TreePine size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
  select: <MousePointer2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
  draw: <Pencil size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
  polygon: (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 16.5L8.2 5.8L17.2 7.1L20 16L12 20.2L4 16.5Z"
        stroke="currentColor"
        strokeWidth={ICON_STROKE}
        strokeLinejoin="round"
      />
      <circle cx="4" cy="16.5" r="1.2" fill="currentColor" />
      <circle cx="8.2" cy="5.8" r="1.2" fill="currentColor" />
      <circle cx="17.2" cy="7.1" r="1.2" fill="currentColor" />
      <circle cx="20" cy="16" r="1.2" fill="currentColor" />
      <circle cx="12" cy="20.2" r="1.2" fill="currentColor" />
    </svg>
  ),
  lot: <Grid2x2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
};


export default function Sidebar() {
  const [mode, setMode] = useAtom(interactionModeAtom);
  const [activeTool, setActiveTool] = useAtom(activeToolAtom);
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);
  const [showDrawPalette, setShowDrawPalette] = useState(false);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const onSave = useSaveHandler();
  const collectData = useCollectPlannerData();
  const setPanelReportOpen = useSetAtom(panelReportOpenAtom);
  const isPolygonTool =
    activeTool === "polygon" || activeTool === "polygon-lot";
  const isDrawTool =
    showDrawPalette ||
    (mode === "draw" &&
      (activeTool === "draw" ||
        activeTool === "flat" ||
        activeTool === "hip" ||
        activeTool === "shed" ||
        activeTool === "lot"));

  const handleSelect = useCallback(() => {
    setMode("select");
    setActiveTool("select");
    setShowDrawPalette(false);
  }, [setMode, setActiveTool]);

  const handleDraw = useCallback(() => {
    // Draw is a category/menu action. Do not enter drawing mode until
    // the user explicitly chooses Roof, Lot, or Tree from the palette.
    setMode("select");
    setActiveTool("select");
    setShowDrawPalette(true);
  }, [setMode, setActiveTool]);

  const handleDrawPaletteTool = useCallback((tool: "hip" | "lot" | "tree") => {
    setMode("draw");
    setActiveTool(tool);
    setShowDrawPalette(false);
  }, [setMode, setActiveTool]);


  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key !== "s" && key !== "d" && key !== "escape") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (key === "s" || key === "escape") {
        handleSelect();
      } else {
        handleDraw();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSelect, handleDraw]);

  const handlePolygonDraw = useCallback(() => {
    setShowDrawPalette(false);
    setMode("draw");
    setActiveTool((prev) => {
      if (prev === "lot" || prev === "polygon-lot") return "polygon-lot";
      if (prev === "hip" || prev === "shed") return "draw";
      return "polygon";
    });
  }, [setShowDrawPalette, setMode, setActiveTool]);

  const handleTreeMode = useCallback(() => {
    setActiveTool("tree");

    setMode("draw");
  }, [setMode, setActiveTool]);

  const handleLotMode = useCallback(() => {
    setActiveTool((prev) =>
      prev === "polygon" || prev === "polygon-lot" ? "polygon-lot" : "lot",
    );
    setMode("draw");
  }, [setMode, setActiveTool]);

  return (
    <div style={sidebarStyle}>
      {}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "clamp(0.4rem, 1vh, 0.65rem)",
        }}
      >
        <button
          title="Select"
          style={
            activeTool === "select" && mode === "select" ? btnActive : btnBase
          }
          onClick={handleSelect}
        >
          {MiscIcons.select}
          <span style={btnLabelStyle}>Select</span>
        </button>
        <button
          title="Draw Roof"
          style={isDrawTool ? btnActive : btnBase}
          onClick={handleDraw}
        >
          {MiscIcons.draw}
          <span style={btnLabelStyle}>Draw</span>
        </button>

        <button
          title="Draw Polygon"
          style={isPolygonTool ? btnActive : btnBase}
          onClick={handlePolygonDraw}
        >
          {MiscIcons.polygon}
          <span style={btnLabelStyle}>Polygon</span>
        </button>

        <button
          title="Undo (Ctrl/Cmd+Z)"
          disabled={!canUndo}
          style={
            canUndo
              ? btnBase
              : { ...btnBase, opacity: 0.35, cursor: "default" }
          }
          onClick={() => undo()}
        >
          <Undo2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <span style={btnLabelStyle}>Undo</span>
        </button>
        <button
          title="Redo (Ctrl/Cmd+Shift+Z)"
          disabled={!canRedo}
          style={
            canRedo
              ? btnBase
              : { ...btnBase, opacity: 0.35, cursor: "default" }
          }
          onClick={() => redo()}
        >
          <Redo2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <span style={btnLabelStyle}>Redo</span>
        </button>
      </div>

      {showDrawPalette && (
        <div
          role="dialog"
          aria-label="Draw tools"
          style={{
            position: "absolute",
            left: "calc(100% + 0.25rem)",
            top: "clamp(3.5rem, 10vh, 5rem)",
            width: "clamp(6rem, 11vw, 9rem)",
            padding: "clamp(0.3rem, 0.7vw, 0.4rem)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.12rem, 0.25vh, 0.18rem)",
            background: "rgba(40, 40, 50, 0.97)",
            backdropFilter: "blur(8px)",
            border: "0.0625rem solid rgba(255,255,255,0.1)",
            borderRadius: "0 0.45rem 0.45rem 0",
            boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.28)",
            zIndex: 250,
          }}
        >
          <div style={{ ...sectionTitleStyle, padding: "clamp(0.25rem, 0.5vh, 0.35rem) clamp(0.15rem, 0.4vw, 0.2rem)" }}>Draw</div>
          <button
            title="Draw Roof"
            style={activeTool === "hip" ? paletteBtnActive : paletteBtnBase}
            onClick={() => handleDrawPaletteTool("hip")}
          >
            <Home size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            <span style={btnLabelStyle}>Roof</span>
          </button>
          <button
            title="Draw Lot"
            style={activeTool === "lot" ? paletteBtnActive : paletteBtnBase}
            onClick={() => handleDrawPaletteTool("lot")}
          >
            <Grid2x2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            <span style={btnLabelStyle}>Lot</span>
          </button>
          <button
            title="Place Pine Tree"
            style={activeTool === "tree" ? paletteBtnActive : paletteBtnBase}
            onClick={() => handleDrawPaletteTool("tree")}
          >
            <TreePine size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            <span style={btnLabelStyle}>Tree</span>
          </button>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: "clamp(0.5rem, 1.5vh, 0.75rem)",
          gap: "clamp(0.15rem, 0.4vh, 0.3rem)",
          borderTop: "0.0625rem solid rgba(255,255,255,0.08)",
          paddingTop: "clamp(0.4rem, 1vh, 0.65rem)",
        }}
      >
        <div style={sectionTitleStyle}>Panels</div>
        <button
          title="Sun Position"
          style={activePanel === "sun" ? btnActive : btnBase}
          onClick={() =>
            setActivePanel((prev) => (prev === "sun" ? null : "sun"))
          }
        >
          <Sun size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <span style={btnLabelStyle}>Sun</span>
        </button>
        <button
          title="Panel Report"
          style={btnBase}
          onClick={() => setPanelReportOpen(true)}
        >
          <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <span style={btnLabelStyle}>Report</span>
        </button>
        {onSave && (
          <button
            title="Save Project"
            style={btnBase}
            onClick={() => onSave(collectData())}
          >
            <Save size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            <span style={btnLabelStyle}>Save</span>
          </button>
        )}
      </div>
    </div>
  );
}
