import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  trees3DAtom,
  selectedTreeAtom,
  selectedTreeIdAtom,
  lastTreeDimensionsAtom,
  type Tree3D,
} from "../../../three/store/rectangleStore";
import { activePanelAtom, metersPerUnitAtom } from "../../../store/atoms";

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
  top: 0,
  left: 72,
  width: 280,
  height: "100%",
  background: "#1e1e2e",
  color: "#cdd6f4",
  borderRight: "1px solid #313244",
  display: "flex",
  flexDirection: "column",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 13,
  zIndex: 200,
  overflow: "hidden",
  transition: "width 0.2s ease",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #313244",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.3,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  userSelect: "none",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#a6adc8",
  marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: 90,
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #45475a",
  background: "#181825",
  color: "#cdd6f4",
  fontSize: 12,
  textAlign: "right",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  background: "#f38ba8",
  color: "#1e1e2e",
};

export function TreePropertiesPanel() {


  const [collapsedId] = useState<string | null>(null);
  const selectedTree = useAtomValue(selectedTreeAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setSelectedTreeId = useSetAtom(selectedTreeIdAtom);
  const [lastDims, setLastDims] = useAtom(lastTreeDimensionsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);

  if (activePanel !== "tree") return null;
  if (!selectedTree) return null;

  const isCollapsed = collapsedId === selectedTree.id;

  const closePanel = () => setActivePanel(null);

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
  };

  return (
    <div style={{ ...panelStyle, width: isCollapsed ? 50 : 280 }}>
      <div style={headerStyle} onClick={closePanel}>
        <span style={{ display: isCollapsed ? "none" : "inline" }}>
          Tree Properties
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#6c7086",
            transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          {isCollapsed ? "▶" : "▼"}
        </span>
      </div>

      {!isCollapsed && (
        <div style={bodyStyle}>
          <div>
            <div style={sectionTitleStyle}>Dimensions (real-world)</div>
            <div style={labelStyle}>
              <span>Canopy radius</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={Number(currentRadiusM.toFixed(2))}
                  onChange={(e) =>
                    handleRadiusChange(parseFloat(e.target.value))
                  }
                  style={inputStyle}
                />
                <span style={{ color: "#6c7086", fontSize: 11 }}>m</span>
              </div>
            </div>
            <div style={labelStyle}>
              <span>Height</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={Number(currentHeightM.toFixed(2))}
                  onChange={(e) =>
                    handleHeightChange(parseFloat(e.target.value))
                  }
                  style={inputStyle}
                />
                <span style={{ color: "#6c7086", fontSize: 11 }}>m</span>
              </div>
            </div>
          </div>

          <div>
            <div style={sectionTitleStyle}>Color</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateTree({ color: c })}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: c,
                    border:
                      selectedTree.color === c
                        ? "2px solid #f9e2af"
                        : "1px solid #45475a",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
          <button style={buttonStyle} onClick={handleDelete}>
            Delete Tree
          </button>
        </div>
      )}
    </div>
  );
}
