import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  interactionModeAtom,
  activeToolAtom,
} from "../store/rectangleStore";

import { panelReportOpenAtom } from "../store/solarPanelStore";
import {
  FileText,
  Grid2x2,
  Home,
  Move,
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
  width: 72,
  background: "rgba(40, 40, 50, 0.95)",
  backdropFilter: "blur(8px)",
  display: "flex",
  flexDirection: "column",
  zIndex: 200,
  overflowY: "auto",
  overflowX: "hidden",
  borderRight: "1px solid rgba(255,255,255,0.08)",
};

const sectionTitleStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)",
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1,
  padding: "10px 0 4px",
  textAlign: "center",
  userSelect: "none",
};

const btnBase: React.CSSProperties = {
  width: 56,
  height: 48,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  transition: "background 0.15s, box-shadow 0.15s",
  background: "transparent",
  color: "#ccc",
  fontSize: 18,
  margin: "2px auto",
  padding: "4px 0",
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "rgba(255,160,0,0.25)",
  boxShadow: "0 0 0 2px rgba(255,160,0,0.6)",
  color: "#ffa500",
};

const btnLabelStyle: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 600,
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginTop: 1,
};


const ICON_SIZE = 24;
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
  pan: <Move size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
};


export default function Sidebar() {
  const [mode, setMode] = useAtom(interactionModeAtom);
  const [activeTool, setActiveTool] = useAtom(activeToolAtom);
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);
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
    mode === "draw" &&
    (activeTool === "draw" ||
      activeTool === "flat" ||
      activeTool === "hip" ||
      activeTool === "shed" ||
      activeTool === "lot");

  const handleSelect = useCallback(() => {
    setMode("select");
    setActiveTool("select");
  }, [setMode, setActiveTool]);

  const handleDraw = useCallback(() => {
    setMode("draw");
    setActiveTool("hip");
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
    setMode("draw");
    setActiveTool((prev) => {
      if (prev === "lot" || prev === "polygon-lot") return "polygon-lot";
      if (prev === "hip" || prev === "shed") return "draw";
      return "polygon";
    });
  }, [setMode, setActiveTool]);

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

  const sections: ToolSection[] = [
    {
      title: "Build",
      items: [
        {
          id: "roof",
          icon: <Home size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
          label: "Roof",
          action: () => {
            setMode("select");
            setActiveTool("select");
            setActivePanel("roof");
            // Roof types now live inside Roof Properties.
          },
        },
        {
          id: "lot",
          icon: MiscIcons.lot,
          label: "Lot",
          action: handleLotMode,
        },
        {
          id: "tree",
          icon: MiscIcons.tree,
          label: "Tree",
          action: handleTreeMode,
        },
      ],
    },
  ];

  return (
    <div style={sidebarStyle}>
      {}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 8,
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
          title="Pan"
          style={activeTool === "pan" ? btnActive : btnBase}
          onClick={() => {
            setActiveTool("pan");
          }}
        >
          {MiscIcons.pan}
          <span style={btnLabelStyle}>Pan</span>
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

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <div style={sectionTitleStyle}>{section.title}</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {section.items.map((item) => {
              const isActive =
                activeTool === item.id ||
                (item.id === "lot" && activeTool === "polygon-lot") ||
                (item.id === "roof" && activePanel === "roof");
              const baseStyle = item.danger
                ? {
                    ...btnBase,
                    color: "#ff6b6b",
                  }
                : btnBase;
              const activeStyle = item.danger
                ? {
                    ...btnActive,
                    background: "rgba(244, 67, 54, 0.2)",
                    boxShadow: "0 0 0 2px rgba(244, 67, 54, 0.6)",
                    color: "#ff6b6b",
                  }
                : btnActive;
              return (
                <button
                  key={item.id}
                  title={item.label}
                  style={isActive ? activeStyle : baseStyle}
                  onClick={() => {
                    if (item.id !== "roof") setActiveTool(item.id);
                    item.action?.();
                  }}
                >
                  {item.icon}
                  <span style={btnLabelStyle}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {}
      <div style={{ flex: 1 }} />

      {}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: 10,
          gap: 4,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 8,
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
          title="Tree Properties"
          style={activePanel === "tree" ? btnActive : btnBase}
          onClick={() =>
            setActivePanel((prev) => (prev === "tree" ? null : "tree"))
          }
        >
          <TreePine size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          <span style={btnLabelStyle}>Tree</span>
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
