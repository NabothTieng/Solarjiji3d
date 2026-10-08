import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  trees3DAtom,
  selectedTreeAtom,
  selectedTreeIdAtom,
  lastTreeDimensionsAtom,
  type Tree3D,
} from "../../../three/store/rectangleStore";
import { activePanelAtom, metersPerUnitAtom } from "../../../store/atoms";

const UMBER = "#fab387";
const PANEL_BG = "rgba(30, 30, 46, 0.96)";
const PANEL_SURFACE = "rgba(49, 50, 68, 0.72)";
const TEXT = "#cdd6f4";
const MUTED = "#a6adc8";
const BORDER = "rgba(255,255,255,0.08)";

const PRESET_COLORS = [
  "#1B5E20",
  "#2E7D32",
  "#388E3C",
  "#43A047",
  "#558B2F",
  "#7CB342",
  "#33691E",
  "#827717",
];

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "clamp(0.5rem, 2vh, 1rem)",
  left: "clamp(4.75rem, 6vw, 5.75rem)",
  width: "clamp(15rem, 18vw, 20rem)",
  maxWidth: "calc(100% - clamp(5.5rem, 7vw, 6.5rem))",
  maxHeight: "calc(100% - clamp(1rem, 4vh, 2rem))",
  background: PANEL_BG,
  color: TEXT,
  border: `0.0625rem solid ${BORDER}`,
  borderRadius: "clamp(0.6rem, 0.9vw, 0.8rem)",
  boxShadow: "0 0.7rem 1.8rem rgba(0,0,0,0.3)",
  backdropFilter: "blur(10px)",
  display: "flex",
  flexDirection: "column",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  zIndex: 400,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "clamp(0.65rem, 1.1vh, 0.9rem) clamp(0.8rem, 1vw, 1rem)",
  borderBottom: `0.0625rem solid ${BORDER}`,
  fontSize: "clamp(0.78rem, 0.9vw, 0.95rem)",
  fontWeight: 700,
  letterSpacing: "0.01rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  userSelect: "none",
};

const bodyStyle: React.CSSProperties = {
  overflowY: "auto",
  padding: "clamp(0.75rem, 1.1vw, 1rem)",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(0.75rem, 1.5vh, 1rem)",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "clamp(0.56rem, 0.68vw, 0.68rem)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06rem",
  color: MUTED,
  marginBottom: "clamp(0.35rem, 0.7vh, 0.5rem)",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "clamp(0.4rem, 0.7vw, 0.6rem)",
  marginBottom: "clamp(0.35rem, 0.7vh, 0.5rem)",
  fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
};

const inputStyle: React.CSSProperties = {
  width: "clamp(4rem, 5vw, 5rem)",
  padding: "clamp(0.3rem, 0.55vh, 0.42rem) clamp(0.4rem, 0.55vw, 0.55rem)",
  borderRadius: "clamp(0.3rem, 0.45vw, 0.4rem)",
  border: "0.0625rem solid #45475a",
  background: "#181825",
  color: TEXT,
  fontSize: "clamp(0.62rem, 0.7vw, 0.72rem)",
  textAlign: "right",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  margin: "0 0 clamp(0.25rem, 0.5vh, 0.4rem)",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "clamp(0.45rem, 0.8vh, 0.6rem) 0",
  borderRadius: "clamp(0.35rem, 0.55vw, 0.5rem)",
  border: `0.0625rem solid #f38ba8`,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
  background: "#45475a",
  color: "#f38ba8",
};

export function TreePropertiesPanel() {
  const selectedTree = useAtomValue(selectedTreeAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const [lastDims, setLastDims] = useAtom(lastTreeDimensionsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);

  if (activePanel !== "tree" || !selectedTree) return null;

  const updateTree = (updates: Partial<Tree3D>) => {
    setTrees((prev) =>
      prev.map((t) => (t.id === selectedTree.id ? { ...t, ...updates } : t)),
    );
  };

  const currentRadiusM = selectedTree.radius * metersPerUnit;
  const currentHeightM = selectedTree.height * metersPerUnit;

  const handleRadiusChange = (meters: number) => {
    if (!Number.isFinite(meters) || meters <= 0) return;
    updateTree({ radius: meters / metersPerUnit });
    setLastDims({ canopyRadius: meters, height: lastDims.height });
  };

  const handleHeightChange = (meters: number) => {
    if (!Number.isFinite(meters) || meters <= 0) return;
    updateTree({ height: meters / metersPerUnit });
    setLastDims({ canopyRadius: lastDims.canopyRadius, height: meters });
  };

  const handleDelete = () => {
    setTrees((prev) => prev.filter((t) => t.id !== selectedTree.id));
    setSelectedTreeId(null);
    setActivePanel(null);
  };

  const minRadius = 0.1;
  const maxRadius = Math.max(10, Math.ceil(currentRadiusM * 2));
  const minHeight = 0.1;
  const maxHeight = Math.max(15, Math.ceil(currentHeightM * 2));

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onClick={() => setActivePanel(null)}>
        <span>Tree Properties</span>
        <span style={{ color: UMBER, fontSize: "clamp(0.8rem, 1vw, 1rem)" }}>▼</span>
      </div>

      <div style={bodyStyle} className="floating-properties-scroll">
        <div>
          <div style={sectionTitleStyle}>Dimensions</div>

          <div style={labelStyle}>
            <span>Canopy Radius</span>
            <span style={{ color: UMBER, fontWeight: 700 }}>{currentRadiusM.toFixed(2)} m</span>
          </div>
          <input
            className="generator-input"
            type="range"
            min={minRadius}
            max={maxRadius}
            step={0.1}
            value={currentRadiusM}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            style={sliderStyle}
          />
          <div style={labelStyle}>
            <span>Height</span>
            <span style={{ color: UMBER, fontWeight: 700 }}>{currentHeightM.toFixed(2)} m</span>
          </div>
          <input
            className="generator-input"
            type="range"
            min={minHeight}
            max={maxHeight}
            step={0.1}
            value={currentHeightM}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            style={sliderStyle}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "clamp(0.25rem, 0.5vw, 0.4rem)" }}>
            <input
              type="number"
              step={0.1}
              min={minRadius}
              value={Number(currentRadiusM.toFixed(2))}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              style={inputStyle}
              aria-label="Canopy radius in meters"
            />
            <input
              type="number"
              step={0.1}
              min={minHeight}
              value={Number(currentHeightM.toFixed(2))}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
              style={inputStyle}
              aria-label="Height in meters"
            />
          </div>
        </div>

        <div>
          <div style={sectionTitleStyle}>Color</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(0.3rem, 0.55vw, 0.45rem)" }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateTree({ color: c })}
                aria-label={`Set tree color ${c}`}
                style={{
                  width: "clamp(1.25rem, 2vw, 1.6rem)",
                  aspectRatio: "1",
                  borderRadius: "0.3rem",
                  background: c,
                  border: selectedTree.color === c ? `0.125rem solid ${UMBER}` : "0.0625rem solid #45475a",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <button style={buttonStyle} onClick={handleDelete}>Delete Tree</button>
      </div>
    </div>
  );
}
