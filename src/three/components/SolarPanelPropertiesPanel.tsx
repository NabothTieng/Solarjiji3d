import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  selectedRoofSideAtom,
  solarPanelConfigsAtom,
  defaultPanelWidthAtom,
  defaultPanelHeightAtom,
  defaultRotationAngleAtom,
  defaultStandHeightAtom,
  defaultRowSpacingAtom,
  defaultColumnSpacingAtom,
  defaultInclinationAngleAtom,
  generatePanelsForRoofSide,
  chimneysToObstacles,
  neighborRoofObstaclePolygons,
} from "../store/solarPanelStore";
import { rectanglesAtom, chimneysAtom } from "../store/rectangleStore";
import {
  activePanelAtom,
  metersPerUnitAtom,
  roofPanelTabAtom,
} from "../../store/atoms";
import { useSolarPlannerConfig } from "../../context/SolarPlannerConfigContext";
import { RoofPanelTabs } from "./RoofPanelTabs";
import { PanelControls } from "./moduleCatalog/PanelControls";
import { usePvModuleSelection } from "./moduleCatalog/usePvModuleSelection";

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
  zIndex: 199,
  overflow: "hidden",
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

export function SolarPanelPropertiesPanel() {
  const [collapsedKey] = useState<string | null>(null);
  const selectedSide = useAtomValue(selectedRoofSideAtom);
  const [panelConfigs, setPanelConfigs] = useAtom(solarPanelConfigsAtom);
  const [panelWidth, setPanelWidth] = useAtom(defaultPanelWidthAtom);
  const [panelHeight, setPanelHeight] = useAtom(defaultPanelHeightAtom);
  const [rotationAngle, setRotationAngle] = useAtom(defaultRotationAngleAtom);
  const [standHeight, setStandHeight] = useAtom(defaultStandHeightAtom);
  const [rowSpacing, setRowSpacing] = useAtom(defaultRowSpacingAtom);
  const [columnSpacing, setColumnSpacing] = useAtom(defaultColumnSpacingAtom);
  const [inclinationAngle, setInclinationAngle] = useAtom(
    defaultInclinationAngleAtom,
  );
  const [livePreview, setLivePreview] = useState(true);
  const loadedConfigSignatureRef = useRef<string | null>(null);
  const skipNextLivePreviewRef = useRef(false);
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);
  const [roofPanelTab] = useAtom(roofPanelTabAtom);
  const rectangles = useAtomValue(rectanglesAtom);
  const chimneys = useAtomValue(chimneysAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const { panelWattage: defaultPanelWattage } = useSolarPlannerConfig();
  const pvModuleSelection = usePvModuleSelection(
    activePanel === "roof" && roofPanelTab === "solar",
  );
  const { selectedPvModule, selectedPvModuleDimensions } = pvModuleSelection;
  const catalogPanelWattage = selectedPvModule?.specs.at_stc?.pmax_w;
  const selectedPanelWattage =
    typeof catalogPanelWattage === "number" && catalogPanelWattage > 0
      ? catalogPanelWattage
      : defaultPanelWattage;
  const effectivePanelWidth =
    selectedPvModuleDimensions?.widthMeters !== undefined
      ? selectedPvModuleDimensions.widthMeters / metersPerUnit
      : panelWidth;
  const effectivePanelHeight =
    selectedPvModuleDimensions?.heightMeters !== undefined
      ? selectedPvModuleDimensions.heightMeters / metersPerUnit
      : panelHeight;

  const selectionKey = selectedSide
    ? `${selectedSide.groupId}:${selectedSide.sideIndex}`
    : null;
  const isCollapsed = selectionKey !== null && collapsedKey === selectionKey;
  const roofSideKey = selectedSide
    ? `${selectedSide.groupId}:${selectedSide.sideIndex}`
    : null;
  const existingConfig = roofSideKey
    ? panelConfigs.find((g) => g.roofSideKey === roofSideKey)
    : undefined;

  const closePanel = () => setActivePanel(null);

  const groupRects = useMemo(() => {
    if (!selectedSide) return [];
    return selectedSide.groupId
      .split("+")
      .map((id) => rectangles.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => !!r);
  }, [rectangles, selectedSide]);

  const obstacles = useMemo(() => {
    if (!selectedSide || groupRects.length === 0) return [];
    return groupRects.flatMap((rect) =>
      chimneysToObstacles(
        chimneys,
        rect,
        selectedSide.vertices,
        selectedSide.normal,
      ),
    );
  }, [chimneys, groupRects, selectedSide]);

  const obstaclePolygons = useMemo(() => {
    if (!selectedSide || groupRects.length < 2) return [];
    return neighborRoofObstaclePolygons(
      groupRects,
      selectedSide.vertices,
      selectedSide.normal,
      selectedSide.rectId,
      selectedSide.indices,
    );
  }, [groupRects, selectedSide]);

  const isFlatSurface =
    !!selectedSide &&
    (selectedSide.groupId.startsWith("lot:") ||
      Math.abs(selectedSide.normal[1]) > 0.95);

  const handleGenerate = useCallback(() => {
    if (!selectedSide || !roofSideKey) return;

    const effectiveRotation = isFlatSurface ? rotationAngle : 0;
    const effectiveStand = isFlatSurface ? standHeight : 0;
    const effectiveRowSpacing = isFlatSurface ? rowSpacing : undefined;
    const effectiveColumnSpacing = isFlatSurface ? columnSpacing : 0.03;
    const effectiveInclination = isFlatSurface ? inclinationAngle : 0;

    const panels = generatePanelsForRoofSide(
      selectedSide.vertices,
      selectedSide.indices,
      selectedSide.normal,
      effectivePanelWidth,
      effectivePanelHeight,
      effectiveColumnSpacing,
      obstacles,
      effectiveRotation,
      effectiveRowSpacing,
      effectiveStand,
      effectiveInclination,
      obstaclePolygons,
    );

    setPanelConfigs((prev) => {
      const filtered = prev.filter((g) => g.roofSideKey !== roofSideKey);
      return [
        ...filtered,
        {
          roofSideKey,
          panelWidth: effectivePanelWidth,
          panelHeight: effectivePanelHeight,
          panelCount: panels.length,
          panelWattage: selectedPanelWattage,
          layoutMode: "generated",
          columnSpacing: effectiveColumnSpacing,
          rotationAngle: effectiveRotation,
          standHeight: effectiveStand,
          rowSpacing: effectiveRowSpacing,
          inclinationAngle: effectiveInclination,
        },
      ];
    });
  }, [
    selectedSide,
    roofSideKey,
    isFlatSurface,
    rotationAngle,
    standHeight,
    rowSpacing,
    columnSpacing,
    inclinationAngle,
    effectivePanelWidth,
    effectivePanelHeight,
    selectedPanelWattage,
    obstacles,
    obstaclePolygons,
    setPanelConfigs,
  ]);

  const configSettingsSignature =
    existingConfig && roofSideKey
      ? [
          roofSideKey,
          existingConfig.panelWidth,
          existingConfig.panelHeight,
          existingConfig.panelWattage ?? "",
          existingConfig.columnSpacing ?? "",
          existingConfig.rotationAngle ?? "",
          existingConfig.standHeight ?? "",
          existingConfig.rowSpacing ?? "",
          existingConfig.inclinationAngle ?? "",
        ].join("|")
      : null;

  useEffect(() => {
    if (!existingConfig || !configSettingsSignature) return;
    if (loadedConfigSignatureRef.current === configSettingsSignature) return;
    loadedConfigSignatureRef.current = configSettingsSignature;
    skipNextLivePreviewRef.current = true;
    setPanelWidth(existingConfig.panelWidth);
    setPanelHeight(existingConfig.panelHeight);
    setColumnSpacing(existingConfig.columnSpacing ?? 0.03);
    setRotationAngle(existingConfig.rotationAngle ?? 0);
    setStandHeight(existingConfig.standHeight ?? 0);
    setRowSpacing(existingConfig.rowSpacing ?? 0.03);
    setInclinationAngle(existingConfig.inclinationAngle ?? 0);
  }, [
    existingConfig,
    configSettingsSignature,
    setPanelWidth,
    setPanelHeight,
    setColumnSpacing,
    setRotationAngle,
    setStandHeight,
    setRowSpacing,
    setInclinationAngle,
  ]);

  const livePreviewSignature = [
    roofSideKey ?? "",
    effectivePanelWidth,
    effectivePanelHeight,
    columnSpacing,
    rotationAngle,
    standHeight,
    rowSpacing,
    inclinationAngle,
  ].join("|");
  const hasManualPanels =
    existingConfig?.layoutMode === "manual" &&
    !!(existingConfig.manualPanels && existingConfig.manualPanels.length > 0);
  const livePreviewPanelCount = existingConfig?.panelCount ?? 0;

  useEffect(() => {
    if (!livePreview || !existingConfig || !roofSideKey) return;
    if (skipNextLivePreviewRef.current) {
      skipNextLivePreviewRef.current = false;
      return;
    }

    if (hasManualPanels) {
      const effectiveRotation = isFlatSurface ? rotationAngle : 0;
      const effectiveStand = isFlatSurface ? standHeight : 0;
      const effectiveRowSpacing = isFlatSurface ? rowSpacing : undefined;
      const effectiveColumnSpacing = isFlatSurface ? columnSpacing : 0.03;
      const effectiveInclination = isFlatSurface ? inclinationAngle : 0;

      setPanelConfigs((prev) =>
        prev.map((config) => {
          if (config.roofSideKey !== roofSideKey) return config;
          if (
            config.panelWidth === effectivePanelWidth &&
            config.panelHeight === effectivePanelHeight &&
            config.panelWattage === selectedPanelWattage &&
            config.columnSpacing === effectiveColumnSpacing &&
            config.rotationAngle === effectiveRotation &&
            config.standHeight === effectiveStand &&
            config.rowSpacing === effectiveRowSpacing &&
            config.inclinationAngle === effectiveInclination
          ) {
            return config;
          }
          return {
            ...config,
            panelWidth: effectivePanelWidth,
            panelHeight: effectivePanelHeight,
            panelWattage: selectedPanelWattage,
            columnSpacing: effectiveColumnSpacing,
            rotationAngle: effectiveRotation,
            standHeight: effectiveStand,
            rowSpacing: effectiveRowSpacing,
            inclinationAngle: effectiveInclination,
          };
        }),
      );
      return;
    }

    if (livePreviewPanelCount === 0) return;
    handleGenerate();
  }, [
    livePreview,
    existingConfig,
    roofSideKey,
    livePreviewPanelCount,
    hasManualPanels,
    livePreviewSignature,
    isFlatSurface,
    rotationAngle,
    standHeight,
    rowSpacing,
    columnSpacing,
    inclinationAngle,
    effectivePanelWidth,
    effectivePanelHeight,
    selectedPanelWattage,
    handleGenerate,
    setPanelConfigs,
  ]);

  if (activePanel !== "roof") return null;
  if (roofPanelTab !== "solar") return null;

  if (!selectedSide) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span>Solar Panels</span>
        </div>
        <RoofPanelTabs />
        <div
          style={{
            ...bodyStyle,
            alignItems: "center",
            justifyContent: "center",
            color: "#6c7086",
          }}
        >
          <p style={{ textAlign: "center", fontSize: 13 }}>
            Select a roof side
          </p>
        </div>
      </div>
    );
  }

  const panelCount = existingConfig?.panelCount ?? 0;

  const handleRemove = () => {
    if (!roofSideKey) return;
    setPanelConfigs((prev) =>
      prev.filter((g) => g.roofSideKey !== roofSideKey),
    );
  };

  return (
    <div style={{ ...panelStyle, width: isCollapsed ? 50 : 280 }}>
      {/* Header */}
      <div style={headerStyle} onClick={closePanel}>
        <span style={{ display: isCollapsed ? "none" : "inline" }}>
          Solar Panels
        </span>
        <span
          style={{
            transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            fontSize: 12,
          }}
        >
          {isCollapsed ? "" : "◀"}
        </span>
      </div>

      {}
      {!isCollapsed && <RoofPanelTabs />}

      {}
      <div style={{ ...bodyStyle, display: isCollapsed ? "none" : "flex" }}>
        {}
        <div
          style={{
            background: "#313244",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
          }}
        >
          <div
            style={{
              ...sectionTitleStyle,
              marginBottom: 4,
              color: "#fab387",
            }}
          >
            Selected Roof Side
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#a6adc8" }}>Side Index</span>
            <span>{selectedSide.sideIndex}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#a6adc8" }}>Panels Placed</span>
            <span style={{ color: panelCount > 0 ? "#a6e3a1" : "#cdd6f4" }}>
              {panelCount}
            </span>
          </div>
        </div>

        {}
        <PanelControls
          selection={pvModuleSelection}
          idPrefix="solar-panel-properties"
          sectionTitleStyle={sectionTitleStyle}
          isFlatSurface={isFlatSurface}
          metersPerUnit={metersPerUnit}
          rotationAngle={rotationAngle}
          setRotationAngle={setRotationAngle}
          standHeight={standHeight}
          setStandHeight={setStandHeight}
          rowSpacing={rowSpacing}
          setRowSpacing={setRowSpacing}
          columnSpacing={columnSpacing}
          setColumnSpacing={setColumnSpacing}
          inclinationAngle={inclinationAngle}
          setInclinationAngle={setInclinationAngle}
          livePreview={{
            label: "Show slider edits",
            checked: livePreview,
            onChange: setLivePreview,
          }}
          actions={{
            onGenerate: handleGenerate,
            showClear: panelCount > 0,
            onClear: handleRemove,
          }}
        />

        {}
        {panelConfigs.length > 0 && (
          <div>
            <div style={sectionTitleStyle}>Summary</div>
            <div
              style={{
                background: "#313244",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#a6adc8" }}>Total Roof Sides</span>
                <span>{panelConfigs.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#a6adc8" }}>Total Panels</span>
                <span style={{ color: "#a6e3a1", fontWeight: 600 }}>
                  {panelConfigs.reduce((sum, g) => sum + g.panelCount, 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
