import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getPvModuleDimensionsMeters,
  getPvModuleDisplayName,
} from "../../../api/components";
import type { PvModuleSelection } from "./usePvModuleSelection";

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 17, 27, 0.7)",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const dialogStyle: React.CSSProperties = {
  width: "min(680px, calc(100vw - 48px))",
  maxHeight: "min(640px, calc(100vh - 48px))",
  background: "#1e1e2e",
  color: "#cdd6f4",
  border: "1px solid #45475a",
  borderRadius: 12,
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.5)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const dialogHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 18px",
  borderBottom: "1px solid #313244",
};

const closeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#a6adc8",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const filtersRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 96px auto",
  gap: 10,
  alignItems: "end",
  padding: "12px 18px 0",
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#a6adc8",
  fontSize: 11,
  display: "block",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 32,
  borderRadius: 6,
  border: "1px solid #45475a",
  background: "#11111b",
  color: "#cdd6f4",
  padding: "6px 9px",
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#cdd6f4",
  fontSize: 12,
  minHeight: 32,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const providersRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  padding: "10px 18px",
  borderBottom: "1px solid #313244",
};

const providerChipStyle: React.CSSProperties = {
  border: "1px solid #45475a",
  background: "#11111b",
  color: "#cdd6f4",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  cursor: "pointer",
};

const providerChipActiveStyle: React.CSSProperties = {
  ...providerChipStyle,
  background: "#fab387",
  borderColor: "#fab387",
  color: "#1e1e2e",
  fontWeight: 600,
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 18px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const moduleCardStyle: React.CSSProperties = {
  textAlign: "left",
  border: "1px solid #45475a",
  background: "#181825",
  borderRadius: 8,
  padding: "10px 14px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#cdd6f4",
  font: "inherit",
};

const moduleCardSelectedStyle: React.CSSProperties = {
  ...moduleCardStyle,
  borderColor: "#fab387",
  background: "#24273a",
};

const moduleTitleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
};

const verifiedBadgeStyle: React.CSSProperties = {
  background: "rgba(166, 227, 161, 0.15)",
  color: "#a6e3a1",
  borderRadius: 4,
  padding: "1px 6px",
  fontSize: 10,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const specsRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 18px",
  fontSize: 11,
};

const specStyle: React.CSSProperties = {
  display: "flex",
  gap: 5,
};

const specLabelStyle: React.CSSProperties = {
  color: "#a6adc8",
};

const helperTextStyle: React.CSSProperties = {
  margin: 0,
  padding: "10px 18px",
  color: "#a6adc8",
  fontSize: 11,
  borderTop: "1px solid #313244",
};

function formatDimensions(module: Parameters<typeof getPvModuleDimensionsMeters>[0]) {
  const dimensions = getPvModuleDimensionsMeters(module);
  if (!dimensions) return null;
  return `${dimensions.widthMeters.toFixed(3)} x ${dimensions.heightMeters.toFixed(3)} m`;
}

/**
 * Modal popup for browsing the PV module catalog. Shows filters and a
 * detailed card per module; clicking a card selects it and closes the
 * dialog. Drive it with {@link usePvModuleSelection}.
 */
export function ModuleCatalogDialog({
  selection,
  onClose,
  idPrefix = "pv-module-dialog",
}: {
  selection: PvModuleSelection;
  onClose: () => void;
  idPrefix?: string;
}) {
  const {
    filteredPvModules,
    pvModulesQuery,
    providers,
    selectedProvider,
    setSelectedProvider,
    moduleSearch,
    setModuleSearch,
    minPowerWatts,
    setMinPowerWatts,
    verifiedOnly,
    setVerifiedOnly,
    selectedPvModule,
    setSelectedModuleId,
  } = selection;
  const isLoading = pvModulesQuery.isLoading;
  const totalAvailable = pvModulesQuery.data?.total ?? selection.pvModules.length;
  const moduleSearchId = `${idPrefix}-module-search`;
  const minPowerId = `${idPrefix}-min-power`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  return createPortal(
    <div style={backdropStyle} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Module catalog"
        style={dialogStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={dialogHeaderStyle}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
            Module Catalog
          </span>
          <button
            type="button"
            aria-label="Close module catalog"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ✕
          </button>
        </div>

        <div style={filtersRowStyle}>
          <div>
            <label style={fieldLabelStyle} htmlFor={moduleSearchId}>
              Search
            </label>
            <input
              id={moduleSearchId}
              type="search"
              value={moduleSearch}
              disabled={isLoading}
              onChange={(event) => setModuleSearch(event.currentTarget.value)}
              placeholder="Model, series, region..."
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label style={fieldLabelStyle} htmlFor={minPowerId}>
              Min W
            </label>
            <input
              id={minPowerId}
              type="number"
              min={0}
              step={1}
              value={minPowerWatts}
              disabled={isLoading}
              onChange={(event) => setMinPowerWatts(event.currentTarget.value)}
              inputMode="numeric"
              placeholder="400"
              style={inputStyle}
            />
          </div>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              disabled={isLoading}
              onChange={(event) => setVerifiedOnly(event.currentTarget.checked)}
              style={{ accentColor: "#fab387" }}
            />
            Verified only
          </label>
        </div>

        <div style={providersRowStyle}>
          <button
            type="button"
            onClick={() => setSelectedProvider("")}
            style={selectedProvider ? providerChipStyle : providerChipActiveStyle}
          >
            All providers
          </button>
          {providers.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() =>
                setSelectedProvider(
                  selectedProvider === provider ? "" : provider,
                )
              }
              style={
                selectedProvider === provider
                  ? providerChipActiveStyle
                  : providerChipStyle
              }
            >
              {provider}
            </button>
          ))}
        </div>

        <div style={listStyle}>
          {isLoading && (
            <p style={{ margin: 0, color: "#a6adc8", fontSize: 12 }}>
              Loading modules...
            </p>
          )}
          {!isLoading && pvModulesQuery.error && (
            <p style={{ margin: 0, color: "#f38ba8", fontSize: 12 }}>
              {pvModulesQuery.error.message}
            </p>
          )}
          {!isLoading && !pvModulesQuery.error && filteredPvModules.length === 0 && (
            <p style={{ margin: 0, color: "#a6adc8", fontSize: 12 }}>
              No modules match the current filters.
            </p>
          )}
          {!isLoading &&
            filteredPvModules.map((module) => {
              const isSelected =
                module.component_id === selectedPvModule?.component_id;
              const dimensions = formatDimensions(module);
              return (
                <button
                  key={module.component_id}
                  type="button"
                  onClick={() => {
                    setSelectedModuleId(module.component_id);
                    onClose();
                  }}
                  style={isSelected ? moduleCardSelectedStyle : moduleCardStyle}
                >
                  <div style={moduleTitleRowStyle}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {getPvModuleDisplayName(module)}
                    </span>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {module.is_verified && (
                        <span style={verifiedBadgeStyle}>Verified</span>
                      )}
                      {isSelected && (
                        <span style={{ color: "#fab387", fontSize: 11, fontWeight: 600 }}>
                          Selected
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={specsRowStyle}>
                    <span style={specStyle}>
                      <span style={specLabelStyle}>Manufacturer</span>
                      <span>{module.manufacturer || "-"}</span>
                    </span>
                    <span style={specStyle}>
                      <span style={specLabelStyle}>Power</span>
                      <span>{module.specs.at_stc?.pmax_w ?? "-"} W</span>
                    </span>
                    <span style={specStyle}>
                      <span style={specLabelStyle}>Efficiency</span>
                      <span>{module.specs.at_stc?.efficiency_pct ?? "-"}%</span>
                    </span>
                    <span style={specStyle}>
                      <span style={specLabelStyle}>Dimensions</span>
                      <span>{dimensions ?? "-"}</span>
                    </span>
                  </div>
                </button>
              );
            })}
        </div>

        {!isLoading && !pvModulesQuery.error && (
          <p style={helperTextStyle}>
            Showing {filteredPvModules.length} of {selection.pvModules.length}{" "}
            loaded modules
            {totalAvailable > selection.pvModules.length
              ? ` (${totalAvailable} available)`
              : ""}
            .
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
