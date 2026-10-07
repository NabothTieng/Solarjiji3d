import type { CSSProperties } from "react";
import { ModuleCatalog } from "./ModuleCatalog";
import type { PvModuleSelection } from "./usePvModuleSelection";

const defaultSectionTitleStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#a6adc8",
  marginBottom: 8,
};

const labelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 6,
};

const buttonStyle: CSSProperties = {
  width: "100%",
  padding: "10px 0",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  transition: "all 0.15s ease",
};

interface RangeLimits {
  spacingMax?: number;
  standHeightMax?: number;
  inclinationMinDeg?: number;
  inclinationMaxDeg?: number;
}

interface LivePreviewControls {
  title?: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

interface ActionControls {
  title?: string;
  generateLabel?: string;
  clearLabel?: string;
  showClear?: boolean;
  onGenerate: () => void;
  onClear?: () => void;
}

export interface PanelControlsProps {
  selection: PvModuleSelection;
  idPrefix?: string;
  sectionTitleStyle?: CSSProperties;
  isFlatSurface: boolean;
  metersPerUnit: number;
  rotationAngle: number;
  setRotationAngle: (value: number) => void;
  standHeight: number;
  setStandHeight: (value: number) => void;
  rowSpacing: number;
  setRowSpacing: (value: number) => void;
  columnSpacing: number;
  setColumnSpacing: (value: number) => void;
  inclinationAngle: number;
  setInclinationAngle: (value: number) => void;
  showLayoutControls?: boolean;
  rangeLimits?: RangeLimits;
  livePreview?: LivePreviewControls;
  actions?: ActionControls;
}

function sliderValueToNumber(value: string) {
  const next = parseFloat(value);
  return Number.isNaN(next) ? null : next;
}

export function PanelControls({
  selection,
  idPrefix,
  sectionTitleStyle = defaultSectionTitleStyle,
  isFlatSurface,
  metersPerUnit,
  rotationAngle,
  setRotationAngle,
  standHeight,
  setStandHeight,
  rowSpacing,
  setRowSpacing,
  columnSpacing,
  setColumnSpacing,
  inclinationAngle,
  setInclinationAngle,
  showLayoutControls = isFlatSurface,
  rangeLimits,
  livePreview,
  actions,
}: PanelControlsProps) {
  const spacingMax = rangeLimits?.spacingMax ?? 2;
  const standHeightMax = rangeLimits?.standHeightMax ?? 3;
  const inclinationMinDeg = rangeLimits?.inclinationMinDeg ?? -90;
  const inclinationMaxDeg = rangeLimits?.inclinationMaxDeg ?? 90;

  return (
    <>
      <ModuleCatalog
        selection={selection}
        idPrefix={idPrefix}
        sectionTitleStyle={sectionTitleStyle}
      />

      {showLayoutControls && (
        <div>
          <div style={sectionTitleStyle}>Layout</div>

          {isFlatSurface && (
            <>
              <div style={labelStyle}>
                <span style={{ color: "#a6adc8" }}>Distribution Angle</span>
                <span
                  style={{ color: "#89b4fa", fontSize: 12, fontWeight: 600 }}
                >
                  {((rotationAngle * 180) / Math.PI).toFixed(0)} deg
                </span>
              </div>
              <input
                type="range"
                min={-90}
                max={90}
                step={1}
                value={(rotationAngle * 180) / Math.PI}
                onChange={(event) => {
                  const deg = sliderValueToNumber(event.currentTarget.value);
                  if (deg !== null) setRotationAngle((deg * Math.PI) / 180);
                }}
                style={{
                  width: "100%",
                  accentColor: "#89b4fa",
                  marginBottom: 12,
                }}
              />
            </>
          )}

          <div style={labelStyle}>
            <span style={{ color: "#a6adc8" }}>Row Spacing</span>
            <span style={{ color: "#89b4fa", fontSize: 12, fontWeight: 600 }}>
              {(rowSpacing * metersPerUnit).toFixed(2)} m
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={spacingMax}
            step={0.01}
            value={rowSpacing * metersPerUnit}
            onChange={(event) => {
              const metersValue = sliderValueToNumber(
                event.currentTarget.value,
              );
              if (metersValue !== null && metersValue >= 0) {
                setRowSpacing(metersValue / metersPerUnit);
              }
            }}
            style={{
              width: "100%",
              accentColor: "#89b4fa",
              marginBottom: 12,
            }}
          />

          <div style={labelStyle}>
            <span style={{ color: "#a6adc8" }}>Column Spacing</span>
            <span style={{ color: "#89b4fa", fontSize: 12, fontWeight: 600 }}>
              {(columnSpacing * metersPerUnit).toFixed(2)} m
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={spacingMax}
            step={0.01}
            value={columnSpacing * metersPerUnit}
            onChange={(event) => {
              const metersValue = sliderValueToNumber(
                event.currentTarget.value,
              );
              if (metersValue !== null && metersValue >= 0) {
                setColumnSpacing(metersValue / metersPerUnit);
              }
            }}
            style={{
              width: "100%",
              accentColor: "#89b4fa",
              marginBottom: isFlatSurface ? 12 : 0,
            }}
          />

          {isFlatSurface && (
            <>
              <div style={labelStyle}>
                <span style={{ color: "#a6adc8" }}>Stand Height</span>
                <span
                  style={{ color: "#89b4fa", fontSize: 12, fontWeight: 600 }}
                >
                  {(standHeight * metersPerUnit).toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={standHeightMax}
                step={0.01}
                value={standHeight * metersPerUnit}
                onChange={(event) => {
                  const metersValue = sliderValueToNumber(
                    event.currentTarget.value,
                  );
                  if (metersValue !== null && metersValue >= 0) {
                    setStandHeight(metersValue / metersPerUnit);
                  }
                }}
                style={{
                  width: "100%",
                  accentColor: "#89b4fa",
                  marginBottom: 12,
                }}
              />

              <div style={labelStyle}>
                <span style={{ color: "#a6adc8" }}>Inclination Angle</span>
                <span
                  style={{ color: "#89b4fa", fontSize: 12, fontWeight: 600 }}
                >
                  {((inclinationAngle * 180) / Math.PI).toFixed(0)} deg
                </span>
              </div>
              <input
                type="range"
                min={inclinationMinDeg}
                max={inclinationMaxDeg}
                step={1}
                value={(inclinationAngle * 180) / Math.PI}
                onChange={(event) => {
                  const deg = sliderValueToNumber(event.currentTarget.value);
                  if (deg !== null) setInclinationAngle((deg * Math.PI) / 180);
                }}
                style={{ width: "100%", accentColor: "#89b4fa" }}
              />
            </>
          )}
        </div>
      )}

      {livePreview && (
        <div>
          <div style={sectionTitleStyle}>{livePreview.title ?? "Live Preview"}</div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              color: livePreview.disabled ? "#6c7086" : "#cdd6f4",
              cursor: livePreview.disabled ? "not-allowed" : "pointer",
            }}
          >
            <span>{livePreview.label}</span>
            <input
              type="checkbox"
              checked={livePreview.checked && !livePreview.disabled}
              disabled={livePreview.disabled}
              onChange={(event) =>
                livePreview.onChange(event.currentTarget.checked)
              }
              style={{ accentColor: "#89b4fa" }}
            />
          </label>
        </div>
      )}

      {actions && (
        <div>
          <div style={sectionTitleStyle}>{actions.title ?? "Actions"}</div>
          <button
            onClick={actions.onGenerate}
            style={{
              ...buttonStyle,
              background: "#89b4fa",
              color: "#1e1e2e",
              marginBottom: actions.showClear ? 10 : 0,
            }}
            onMouseEnter={(event) =>
              (event.currentTarget.style.background = "#74a8f7")
            }
            onMouseLeave={(event) =>
              (event.currentTarget.style.background = "#89b4fa")
            }
          >
            {actions.generateLabel ?? "Generate"}
          </button>

          {actions.showClear && actions.onClear && (
            <button
              onClick={actions.onClear}
              style={{
                ...buttonStyle,
                background: "#f38ba8",
                color: "#1e1e2e",
              }}
              onMouseEnter={(event) =>
                (event.currentTarget.style.background = "#e87898")
              }
              onMouseLeave={(event) =>
                (event.currentTarget.style.background = "#f38ba8")
              }
            >
              {actions.clearLabel ?? "Clear"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
