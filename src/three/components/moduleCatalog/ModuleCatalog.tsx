import { useState } from "react";
import { getPvModuleDisplayName } from "../../../api/components";
import { ModuleCatalogDialog } from "./ModuleCatalogDialog";
import type { PvModuleSelection } from "./usePvModuleSelection";

const sectionTitleStyleDefault: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#a6adc8",
  marginBottom: 8,
};

const selectedCardStyle: React.CSSProperties = {
  background: "#313244",
  borderRadius: 8,
  padding: "10px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  marginBottom: 8,
};

const specRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
};

const browseButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 0",
  borderRadius: 8,
  border: "1px solid #45475a",
  background: "#11111b",
  color: "#89b4fa",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
  transition: "all 0.15s ease",
};

const helperTextStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#a6adc8",
  fontSize: 11,
  lineHeight: 1.4,
};

/**
 * PV module catalog entry point: shows the selected module's details in a
 * card and opens {@link ModuleCatalogDialog} to browse and pick another
 * module. Drive it with {@link usePvModuleSelection}.
 * `sectionTitleStyle` lets each host match its own section headings.
 */
export function ModuleCatalog({
  selection,
  sectionTitleStyle = sectionTitleStyleDefault,
  idPrefix = "pv-module-catalog",
}: {
  selection: PvModuleSelection;
  sectionTitleStyle?: React.CSSProperties;
  idPrefix?: string;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { pvModulesQuery, selectedPvModule, selectedPvModuleDimensions } =
    selection;
  const isLoading = pvModulesQuery.isLoading;

  return (
    <div>
      <div style={sectionTitleStyle}>Module Catalog</div>
      {selectedPvModule ? (
        <div style={selectedCardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
            {getPvModuleDisplayName(selectedPvModule)}
          </div>
          <div style={specRowStyle}>
            <span style={{ color: "#a6adc8" }}>Power</span>
            <span>{selectedPvModule.specs.at_stc?.pmax_w ?? "-"} W</span>
          </div>
          <div style={specRowStyle}>
            <span style={{ color: "#a6adc8" }}>Efficiency</span>
            <span>{selectedPvModule.specs.at_stc?.efficiency_pct ?? "-"}%</span>
          </div>
          <div style={specRowStyle}>
            <span style={{ color: "#a6adc8" }}>Dimensions</span>
            <span>
              {selectedPvModuleDimensions
                ? `${selectedPvModuleDimensions.widthMeters.toFixed(3)} x ${selectedPvModuleDimensions.heightMeters.toFixed(3)} m`
                : "-"}
            </span>
          </div>
        </div>
      ) : (
        <p style={{ ...helperTextStyle, margin: "0 0 8px" }}>
          {isLoading ? "Loading modules..." : "No module selected."}
        </p>
      )}
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={isLoading}
        style={{
          ...browseButtonStyle,
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "#181825";
          event.currentTarget.style.borderColor = "#89b4fa";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "#11111b";
          event.currentTarget.style.borderColor = "#45475a";
        }}
      >
        {selectedPvModule ? "Change Module" : "Browse Modules"}
      </button>
      {pvModulesQuery.error && (
        <p style={{ ...helperTextStyle, color: "#f38ba8" }}>
          {pvModulesQuery.error.message}
        </p>
      )}
      {selectedPvModuleDimensions && (
        <p style={helperTextStyle}>
          Width and height are loaded from the selected module.
        </p>
      )}
      {isDialogOpen && (
        <ModuleCatalogDialog
          selection={selection}
          idPrefix={`${idPrefix}-dialog`}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}
