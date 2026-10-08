import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import {
  trees3DAtom,
  selectedTreeAtom,
  selectedTreeIdAtom,
  lastTreeDimensionsAtom,
  type Tree3D,
} from "../../../three/store/rectangleStore";
import { activePanelAtom, metersPerUnitAtom } from "../../../store/atoms";

const UMBER = "#fab387";
const PANEL_BG = "rgba(30, 30, 46, 0.97)";
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
  width: "clamp(15.5rem, 19vw, 21rem)",
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
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const bodyStyle: React.CSSProperties = {
  overflowY: "auto",
  padding: "clamp(0.55rem, 0.9vw, 0.8rem)",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(0.45rem, 0.8vh, 0.65rem)",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const sectionButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
  padding: "clamp(0.55rem, 0.85vh, 0.7rem) clamp(0.6rem, 0.8vw, 0.75rem)",
  background: PANEL_SURFACE,
  border: `0.0625rem solid ${BORDER}`,
  borderRadius: "clamp(0.35rem, 0.5vw, 0.45rem)",
  color: TEXT,
  cursor: "pointer",
  textAlign: "left",
  fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
  fontWeight: 700,
};

const sectionContentStyle: React.CSSProperties = {
  marginTop: "0.35rem",
  padding: "clamp(0.6rem, 0.8vw, 0.75rem)",
  background: "rgba(24, 24, 37, 0.62)",
  border: `0.0625rem solid ${BORDER}`,
  borderRadius: "0.4rem",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "clamp(0.4rem, 0.7vw, 0.6rem)",
  marginBottom: "clamp(0.35rem, 0.65vh, 0.5rem)",
  fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
};

const inputStyle: React.CSSProperties = {
  width: "clamp(4.2rem, 5vw, 5.2rem)",
  padding: "clamp(0.28rem, 0.5vh, 0.4rem) clamp(0.35rem, 0.5vw, 0.5rem)",
  borderRadius: "0.35rem",
  border: "0.0625rem solid #45475a",
  background: "#181825",
  color: TEXT,
  fontSize: "clamp(0.62rem, 0.7vw, 0.72rem)",
  textAlign: "right",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  margin: "0 0 clamp(0.45rem, 0.7vh, 0.6rem)",
};

const dangerButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "clamp(0.45rem, 0.8vh, 0.6rem) 0",
  borderRadius: "0.4rem",
  border: "0.0625rem solid #f38ba8",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "clamp(0.62rem, 0.72vw, 0.72rem)",
  background: "#45475a",
  color: "#f38ba8",
};

function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" style={sectionButtonStyle} onClick={onToggle}>
        <span>{title}</span>
        <span style={{ color: UMBER, fontSize: "0.9rem" }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div style={sectionContentStyle}>{children}</div>}
    </div>
  );
}

export function TreePropertiesPanel() {
  const selectedTree = useAtomValue(selectedTreeAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const [lastDims, setLastDims] = useAtom(lastTreeDimensionsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);
  const [openSection, setOpenSection] = useState<"tree" | "dimensions" | "position" | "appearance" | null>("tree");

  if (activePanel !== "tree" || !selectedTree) return null;

  const updateTree = (updates: Partial<Tree3D>) => {
    setTrees((prev) =>
      prev.map((t) => (t.id === selectedTree.id ? { ...t, ...updates } : t)),
    );
  };

  const currentRadiusM = selectedTree.radius * metersPerUnit;
  const currentHeightM = selectedTree.height * metersPerUnit;
  const currentXM = selectedTree.position[0] * metersPerUnit;
  const currentZM = selectedTree.position[2] * metersPerUnit;

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

  const handlePositionChange = (axis: "x" | "z", meters: number) => {
    if (!Number.isFinite(meters)) return;
    const position: [number, number, number] = [...selectedTree.position];
    position[axis === "x" ? 0 : 2] = meters / metersPerUnit;
    updateTree({ position });
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
      <div style={headerStyle}>
        <div>
          <div>Tree Properties</div>
          <div style={{ color: MUTED, fontSize: "clamp(0.52rem, 0.62vw, 0.62rem)", fontWeight: 500, marginTop: "0.18rem" }}>
            Realistic tree / obstacle
          </div>
        </div>
        <button
          type="button"
          aria-label="Close tree properties"
          onClick={() => setActivePanel(null)}
          style={{ background: "transparent", border: 0, color: UMBER, cursor: "pointer", fontSize: "1rem" }}
        >
          ×
        </button>
      </div>

      <div style={bodyStyle} className="floating-properties-scroll">
        <AccordionSection
          title="Tree Type"
          open={openSection === "tree"}
          onToggle={() => setOpenSection(openSection === "tree" ? null : "tree")}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
            {[
              { id: "pine" as const, label: "Pine" },
              { id: "jacaranda" as const, label: "Jacaranda" },
            ].map((option) => {
              const active = (selectedTree.model ?? "pine") === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateTree({ model: option.id })}
                  style={{
                    padding: "clamp(0.45rem, 0.7vh, 0.6rem) 0.35rem",
                    borderRadius: "0.4rem",
                    border: `0.0625rem solid ${active ? UMBER : BORDER}`,
                    background: active ? "rgba(250,179,135,0.14)" : "rgba(24,24,37,0.65)",
                    color: active ? UMBER : TEXT,
                    cursor: "pointer",
                    fontSize: "clamp(0.58rem, 0.68vw, 0.68rem)",
                    fontWeight: 700,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div style={{ color: MUTED, fontSize: "clamp(0.52rem, 0.6vw, 0.6rem)", marginTop: "0.5rem" }}>
            Change the tree species without changing its position or dimensions.
          </div>
        </AccordionSection>

        <AccordionSection
          title="Dimensions"
          open={openSection === "dimensions"}
          onToggle={() => setOpenSection(openSection === "dimensions" ? null : "dimensions")}
        >
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
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
        </AccordionSection>

        <AccordionSection
          title="Position"
          open={openSection === "position"}
          onToggle={() => setOpenSection(openSection === "position" ? null : "position")}
        >
          <div style={labelStyle}>
            <span>X Position</span>
            <input
              type="number"
              step={0.1}
              value={Number(currentXM.toFixed(2))}
              onChange={(e) => handlePositionChange("x", parseFloat(e.target.value))}
              style={inputStyle}
              aria-label="Tree X position in meters"
            />
          </div>
          <div style={{ ...labelStyle, marginBottom: 0 }}>
            <span>Z Position</span>
            <input
              type="number"
              step={0.1}
              value={Number(currentZM.toFixed(2))}
              onChange={(e) => handlePositionChange("z", parseFloat(e.target.value))}
              style={inputStyle}
              aria-label="Tree Z position in meters"
            />
          </div>
          <div style={{ color: MUTED, fontSize: "clamp(0.52rem, 0.6vw, 0.6rem)", marginTop: "0.55rem" }}>
            Drag the tree in the 3D view for quick placement. The tree stays grounded at Y = 0.
          </div>
        </AccordionSection>

        <AccordionSection
          title="Appearance"
          open={openSection === "appearance"}
          onToggle={() => setOpenSection(openSection === "appearance" ? null : "appearance")}
        >
          <div style={{ color: MUTED, fontSize: "clamp(0.55rem, 0.62vw, 0.64rem)", marginBottom: "0.55rem" }}>
            Tint the foliage to match the site conditions.
          </div>
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
        </AccordionSection>

        <div>
          <div style={{ color: MUTED, fontSize: "clamp(0.55rem, 0.62vw, 0.64rem)", textTransform: "uppercase", letterSpacing: "0.05rem", marginBottom: "0.45rem" }}>
            Actions
          </div>
          <button style={dangerButtonStyle} onClick={handleDelete}>Delete Tree</button>
        </div>
      </div>
    </div>
  );
}
