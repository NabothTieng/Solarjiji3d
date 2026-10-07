import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useState, useEffect, useCallback } from "react";
import {
  rectanglesAtom,
  selectedRectangleAtom,
  ROOF_TYPE_OPTIONS,
  type RoofType,
  type Rectangle3D,
  type ShedDirection,
  chimneysAtom,
  selectedChimneyIdAtom,
  isDraggingHandleAtom,
} from "../store/rectangleStore";
import {
  metersPerUnitAtom,
  activePanelAtom,
  roofPanelTabAtom,
} from "../../store/atoms";
import { solarPanelConfigsAtom } from "../store/solarPanelStore";
import { Box, Button, Input, Span, VStack } from "@chakra-ui/react";

import { RoofPanelTabs } from "./RoofPanelTabs";
import { ChimneyPropertiesPanel } from "../../ui/components/panels/ChimneyPropertiesPanel";


function RoofTypeButton({
  id,
  name,
  description,
  isActive,
  onClick,
}: {
  id: RoofType;
  name: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const icons: Record<RoofType, string> = {
    flat: "▬",
    hip: "△",
    shed: "◣",
    gambrel: "⌒",
  };

  return (
    <Button
      onClick={onClick}
      title={description}
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1}
      padding="clamp(0.35rem, 0.7vh, 0.55rem) clamp(0.3rem, 0.6vw, 0.5rem)"
      minH="clamp(3rem, 6vh, 3.8rem)"
      bg={isActive ? "rgba(255,160,0,0.16)" : "#313244"}
      border={isActive ? "0.125rem solid #ffa500" : "0.0625rem solid #45475a"}
      borderRadius="clamp(0.35rem, 0.55vw, 0.5rem)"
      color={isActive ? "#ffa500" : "#cdd6f4"}
      cursor="pointer"
      transition="all 0.15s ease"
      fontSize="clamp(0.7rem, 0.75vw, 0.8rem)"
    >
      <Span fontSize="clamp(1.15rem, 1.5vw, 1.45rem)">{icons[id]}</Span>
      <Span fontWeight={isActive ? 600 : 400}>{name}</Span>
    </Button>
  );
}

// ---------------------------------------------------------------------------


const PRESET_COLORS = [
  "#ffffff",
  "#f5f5f5",
  "#d4a373",
  "#bc6c25",
  "#606c38",
  "#283618",
  "#a8dadc",
  "#457b9d",
  "#e63946",
  "#264653",
  "#2a9d8f",
  "#e9c46a",
];


function getShedHighDir(rect: Rectangle3D): { x: number; z: number } | null {
  const dx = rect.end[0] - rect.start[0];
  const dz = rect.end[2] - rect.start[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  const nx = dx / len;
  const nz = dz / len;

  const perpX = -nz;
  const perpZ = nx;
  const sign = (rect.shedDirection ?? "left") === "left" ? 1 : -1;
  return { x: perpX * sign, z: perpZ * sign };
}


function alignShedToWorldDir(
  rect: Rectangle3D,
  target: { x: number; z: number },
): ShedDirection {
  const dx = rect.end[0] - rect.start[0];
  const dz = rect.end[2] - rect.start[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return rect.shedDirection ?? "left";
  const nx = dx / len;
  const nz = dz / len;
  const perpX = -nz;
  const perpZ = nx;
  const dot = perpX * target.x + perpZ * target.z;
  return dot >= 0 ? "left" : "right";
}

function SectionTitle({
  children,
  color = "#a6adc8",
  expanded,
  onToggle,
}: {
  children: React.ReactNode;
  color?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "clamp(0.35rem, 0.7vh, 0.5rem) 0",
        border: 0,
        borderBottom: "0.0625rem solid rgba(255,255,255,0.07)",
        background: "transparent",
        color,
        fontSize: "clamp(0.62rem, 0.7vw, 0.72rem)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06rem",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        style={{
          fontSize: "clamp(1rem, 1.25vw, 1.2rem)",
          lineHeight: 1,
          fontWeight: 400,
          color: expanded ? "#ffa500" : "rgba(255,255,255,0.65)",
          flexShrink: 0,
        }}
      >
        {expanded ? "−" : "+"}
      </span>
    </button>
  );
}

const dimensionSliderStyle: React.CSSProperties = {
  width: "100%",
  height: "clamp(0.25rem, 0.45vh, 0.375rem)",
  accentColor: "#89b4fa",
  cursor: "pointer",
};

const dimensionNumberInputStyle: React.CSSProperties = {
  width: "clamp(3.6rem, 5.2vw, 4.6rem)",
  alignSelf: "flex-end",
  textAlign: "right",
  padding: "clamp(0.3rem, 0.6vh, 0.45rem) clamp(0.45rem, 0.7vw, 0.65rem)",
  background: "#313244",
  border: "1px solid #45475a",
  borderRadius: 6,
  color: "#cdd6f4",
  fontSize: 13,
  outline: "none",
};

// ---------------------------------------------------------------------------


export function RoofPropertiesPanel() {
  const selectedRect = useAtomValue(selectedRectangleAtom);
  const [rectangles, setRectangles] = useAtom(rectanglesAtom);
  const [, setChimneys] = useAtom(chimneysAtom);
  const [, setSolarPanelConfigs] = useAtom(solarPanelConfigsAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const [collapsedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    roofType: true,
    dimensions: false,
    color: false,
    roofSlope: false,
    chimney: false,
  });
  const [activePanel, setActivePanel] = useAtom(activePanelAtom);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const roofPanelTab = useAtomValue(roofPanelTabAtom);
  const isDraggingHandle = useAtomValue(isDraggingHandleAtom);

  const deleteRect = useCallback(() => {
    if (!selectedRect) return;
    setSolarPanelConfigs((prev) =>
      prev.filter((config) => {
        const rectId = config.roofSideKey.split(":")[0];
        return rectId !== selectedRect.id;
      }),
    );
    setRectangles((prev) => prev.filter((r) => r.id !== selectedRect.id));
  }, [selectedRect, setRectangles, setSolarPanelConfigs]);


  useEffect(() => {
    if (!selectedRect) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteRect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedRect, deleteRect]);


  if (activePanel !== "roof") return null;
  if (roofPanelTab === "chimney") return <ChimneyPropertiesPanel />;
  if (roofPanelTab !== "roof") return null;
  if (!selectedRect) return null;


  if (isDraggingHandle) return null;

  const collapsed = collapsedId === selectedRect.id;

  const closePanel = () => setActivePanel(null);

  const toMeters = (worldUnits: number) => worldUnits * metersPerUnit;
  const fromMeters = (meters: number) => meters / metersPerUnit;

  const updateMeterDimension = (
    key: "wallHeight" | "pitchAngle" | "depth",
    meters: number,
    minWorldUnits: number,
  ) => {
    if (!Number.isFinite(meters)) return;
    updateRect({ [key]: Math.max(minWorldUnits, fromMeters(meters)) });
  };

  const updateRect = (updates: Partial<Rectangle3D>) => {


    const syncKeys: (keyof Rectangle3D)[] = [
      "depth",
      "wallHeight",
      "pitchAngle",
    ];
    const hasSyncUpdate = syncKeys.some((k) => k in updates);

    setRectangles((prev) => {
      if (!hasSyncUpdate) {
        return prev.map((r) =>
          r.id === selectedRect.id ? { ...r, ...updates } : r,
        );
      }


      const connectedIds = new Set<string>();
      const queue = [selectedRect.id];
      const rectMap = new Map(prev.map((r) => [r.id, r]));
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (connectedIds.has(id)) continue;
        connectedIds.add(id);
        const r = rectMap.get(id);
        if (!r) continue;

        for (const merge of [r.mergeStart, r.mergeEnd]) {
          if (merge && !connectedIds.has(merge.rectId)) {
            queue.push(merge.rectId);
          }
        }

        for (const other of prev) {
          if (connectedIds.has(other.id)) continue;
          if (
            other.mergeStart?.rectId === id ||
            other.mergeEnd?.rectId === id
          ) {
            queue.push(other.id);
          }
        }
      }


      const syncUpdates: Partial<Rectangle3D> = {};
      for (const k of syncKeys) {
        if (k in updates) {
          (syncUpdates as Record<string, unknown>)[k] =
            updates[k as keyof Rectangle3D];
        }
      }

      return prev.map((r) => {
        if (r.id === selectedRect.id) return { ...r, ...updates };
        if (connectedIds.has(r.id)) return { ...r, ...syncUpdates };
        return r;
      });
    });
  };

  const addChimney = () => {
    const newChimney = {
      id: `chimney-${Date.now()}`,
      rectangleId: selectedRect.id,
      shape: "rectangular" as const,
      localX: 0,
      localZ: 0,
      width: 0.4,
      depth: 0.3,
      height: 0.8,
      color: "#8B4513",
    };
    setChimneys((prev) => [...prev, newChimney]);
    setSelectedChimneyId(newChimney.id);
  };

  return (
    <Box
      position="absolute"
      left="clamp(4rem, 5vw, 4.5rem)"
      top={0}
      width={collapsed ? "clamp(2.8rem, 3vw, 3.4rem)" : "clamp(15rem, 17vw, 18rem)"}
      height="100%"
      bg="rgba(40, 40, 50, 0.97)"
      color="#cdd6f4"
      borderRight="0.0625rem solid rgba(255,255,255,0.08)"
      display="flex"
      flexDirection="column"
      fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      fontSize="clamp(0.72rem, 0.75vw, 0.82rem)"
      zIndex={200}
      overflow="hidden"
      transition="width 0.2s ease"
    >
      {}
      <Box
        padding="clamp(0.65rem, 1.1vw, 0.9rem) clamp(0.75rem, 1.15vw, 1rem)"
        borderBottom="0.0625rem solid rgba(255,255,255,0.08)"
        fontSize="clamp(0.85rem, 1vw, 1rem)"
        fontWeight={600}
        letterSpacing={0.3}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        cursor="pointer"
        userSelect="none"
        onClick={closePanel}
      >
        <Span display={collapsed ? "none" : "inline"}>Roof Properties</Span>
        <Span
          style={{
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            fontSize: 12,
          }}
        >
          {collapsed ? "▶" : "▼"}
        </Span>
      </Box>

      {/* Tabs */}
      {!collapsed && <RoofPanelTabs />}

      {}
      <Box
        flex={1}
        overflowY="auto"
        padding="clamp(0.65rem, 1vw, 0.9rem) clamp(0.75rem, 1.15vw, 1rem)"
        display={collapsed ? "none" : "flex"}
        flexDirection="column"
        gap="clamp(0.45rem, 0.9vh, 0.7rem)"
      >
        {}
        <Box>
          <SectionTitle expanded={expandedSections.roofType} onToggle={() => toggleSection("roofType")}>Roof Type</SectionTitle>
          {expandedSections.roofType && (
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap="clamp(0.35rem, 0.65vh, 0.55rem)">
            {ROOF_TYPE_OPTIONS.map((opt) => (
              <RoofTypeButton
                key={opt.id}
                id={opt.id}
                name={opt.name}
                description={opt.description}
                isActive={selectedRect.roofType === opt.id}
                onClick={() => {
                  console.log("[RoofTypeButton] click", {
                    optId: opt.id,
                    selectedRectId: selectedRect.id,
                    currentRoofType: selectedRect.roofType,
                    activePanel,
                    isDraggingHandle,
                  });
                  updateRect({ roofType: opt.id });
                }}
              />
            ))}
          </Box>          )}

        </Box>

        {}
        <Box>
          <SectionTitle expanded={expandedSections.dimensions} onToggle={() => toggleSection("dimensions")}>Dimensions</SectionTitle>
          {expandedSections.dimensions && (
          <>
          {/* Wall Height */}
          <VStack align="stretch" gap="clamp(0.35rem, 0.65vh, 0.55rem)">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Span>Wall Height</Span>
              <Span color="#89b4fa" fontSize={12} fontWeight={600}>
                {toMeters(selectedRect.wallHeight).toFixed(2)} m
              </Span>
            </Box>
            <VStack align="stretch" gap="clamp(0.35rem, 0.65vh, 0.55rem)">
              <input
                type="range"
                min={0.5}
                max={15}
                step={0.05}
                value={toMeters(selectedRect.wallHeight)}
                onChange={(e) =>
                  updateMeterDimension("wallHeight", parseFloat(e.target.value), 0.1)
                }
                style={dimensionSliderStyle}
              />
              <input
                type="number"
                min={0.5}
                max={15}
                step={0.05}
                value={toMeters(selectedRect.wallHeight).toFixed(2)}
                onChange={(e) =>
                  updateMeterDimension("wallHeight", parseFloat(e.target.value), 0.1)
                }
                style={dimensionNumberInputStyle}
              />
            </VStack>
          </VStack>

          {}
          {selectedRect.roofType !== "flat" && (
            <>
              <VStack align="stretch" gap="clamp(0.35rem, 0.65vh, 0.55rem)" mt="clamp(0.7rem, 1.5vh, 1rem)">
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Span>Pitch Height</Span>
                  <Span color="#89b4fa" fontSize={12} fontWeight={600}>
                    {toMeters(selectedRect.pitchAngle).toFixed(2)} m
                  </Span>
                </Box>
                <VStack align="stretch" gap="clamp(0.35rem, 0.65vh, 0.55rem)">
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.05}
                    value={toMeters(selectedRect.pitchAngle)}
                    onChange={(e) =>
                      updateMeterDimension("pitchAngle", parseFloat(e.target.value), 0.1)
                    }
                    style={dimensionSliderStyle}
                  />
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.05}
                    value={toMeters(selectedRect.pitchAngle).toFixed(2)}
                    onChange={(e) =>
                      updateMeterDimension("pitchAngle", parseFloat(e.target.value), 0.1)
                    }
                    style={dimensionNumberInputStyle}
                  />
                </VStack>
              </VStack>
            </>
          )}

          {/* Depth (width of the roof) */}
          <VStack align="stretch" gap="clamp(0.35rem, 0.65vh, 0.55rem)" mt="clamp(0.7rem, 1.5vh, 1rem)">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Span>Roof Width</Span>
              <Span color="#89b4fa" fontSize={12} fontWeight={600}>
                {toMeters(selectedRect.depth).toFixed(2)} m
              </Span>
            </Box>
            <VStack align="stretch" gap="clamp(0.35rem, 0.65vh, 0.55rem)">
              <input
                type="range"
                min={1}
                max={25}
                step={0.1}
                value={toMeters(selectedRect.depth)}
                onChange={(e) =>
                  updateMeterDimension("depth", parseFloat(e.target.value), 0.2)
                }
                style={dimensionSliderStyle}
              />
              <input
                type="number"
                min={1}
                max={25}
                step={0.1}
                value={toMeters(selectedRect.depth).toFixed(2)}
                onChange={(e) =>
                  updateMeterDimension("depth", parseFloat(e.target.value), 0.2)
                }
                style={dimensionNumberInputStyle}
              />
            </VStack>
          </VStack>
          </>
          )}

        </Box>

        {/* ------- Color ------- */}
        <Box>
          <SectionTitle expanded={expandedSections.color} onToggle={() => toggleSection("color")}>Color</SectionTitle>
          {expandedSections.color && (
          <>
          <Box
            display="grid"
            gridTemplateColumns="repeat(6, 1fr)"
            gap="clamp(0.25rem, 0.5vw, 0.4rem)"
            mb="clamp(0.45rem, 0.8vh, 0.65rem)"
          >
            {PRESET_COLORS.map((c) => (
              <Button
                key={c}
                onClick={() => updateRect({ color: c })}
                width="100%"
                aspectRatio="1"
                bg={c}
                border={
                  selectedRect.color === c
                    ? "2px solid #89b4fa"
                    : "1px solid #45475a"
                }
                borderRadius="clamp(0.3rem, 0.5vw, 0.45rem)"
                cursor="pointer"
                minW={0}
                padding={0}
              />
            ))}
          </Box>
          <Input
            type="color"
            value={selectedRect.color}
            onChange={(e) => updateRect({ color: e.target.value })}
            width="100%"
            height="clamp(1.7rem, 3.5vh, 2rem)"
            border="none"
            borderRadius="clamp(0.3rem, 0.5vw, 0.45rem)"
            cursor="pointer"
            bg="transparent"
          />
          </>
          )}

        </Box>

        {/* ------- End Caps ------- */}
        {/* {selectedRect.roofType !== "flat" && (


        )} */}

        {/* ------- Shed direction toggle ------- */}
        {selectedRect.roofType === "shed" && (
          <Box>
            <SectionTitle expanded={expandedSections.roofSlope} onToggle={() => toggleSection("roofSlope")}>Roof Slope</SectionTitle>
          {expandedSections.roofSlope && (
            <Button
              onClick={() => {


                const newDir: ShedDirection =
                  (selectedRect.shedDirection ?? "left") === "left"
                    ? "right"
                    : "left";
                const proposed: Rectangle3D = {
                  ...selectedRect,
                  shedDirection: newDir,
                };
                const targetDir = getShedHighDir(proposed);

                const connected = new Set<string>();
                const queue = [selectedRect.id];
                const map = new Map(rectangles.map((r) => [r.id, r]));
                while (queue.length) {
                  const id = queue.shift()!;
                  if (connected.has(id)) continue;
                  connected.add(id);
                  const r = map.get(id);
                  if (!r) continue;
                  for (const m of [r.mergeStart, r.mergeEnd]) {
                    if (m && !connected.has(m.rectId)) queue.push(m.rectId);
                  }
                  for (const other of rectangles) {
                    if (connected.has(other.id)) continue;
                    if (
                      other.mergeStart?.rectId === id ||
                      other.mergeEnd?.rectId === id
                    ) {
                      queue.push(other.id);
                    }
                  }
                }

                setRectangles((prev) => {
                  return prev.map((r) => {
                    if (r.id === selectedRect.id)
                      return { ...r, shedDirection: newDir };
                    if (!connected.has(r.id)) return r;
                    if (r.roofType !== "shed") return r;
                    if (!targetDir) return r;
                    return {
                      ...r,
                      shedDirection: alignShedToWorldDir(r, targetDir),
                    };
                  });
                });
              }}
              width="full"
              padding="clamp(0.4rem, 0.8vh, 0.6rem)"
              bg="#313244"
              border="1px solid #89b4fa"
              borderRadius="clamp(0.35rem, 0.55vw, 0.5rem)"
              color="#cdd6f4"
              cursor="pointer"
              fontSize="clamp(0.72rem, 0.75vw, 0.82rem)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
            >
              Flip Slope{" "}
              {(selectedRect.shedDirection ?? "left") === "left"
                ? "(high side: left)"
                : "(high side: right)"}
            </Button>          )}

          </Box>
        )}

        {}
        <Box>
          <SectionTitle expanded={expandedSections.chimney} onToggle={() => toggleSection("chimney")}>Chimney / Obstacle</SectionTitle>
          {expandedSections.chimney && (
          <Button
            onClick={addChimney}
            width="full"
            padding="clamp(0.4rem, 0.8vh, 0.6rem)"
            bg="#313244"
            border="1px solid #fab387"
            borderRadius="clamp(0.35rem, 0.55vw, 0.5rem)"
            color="#fab387"
            fontWeight={600}
            cursor="pointer"
            fontSize="clamp(0.72rem, 0.75vw, 0.82rem)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={2}
          >
            🏠 Add Chimney
          </Button>          )}

        </Box>

        {/* ------- Delete ------- */}
        <Box marginTop="auto" paddingTop={12}>
          <Button
            onClick={deleteRect}
            width="full"
            padding="clamp(0.4rem, 0.8vh, 0.6rem)"
            bg="#45475a"
            border="1px solid #f38ba8"
            borderRadius="clamp(0.35rem, 0.55vw, 0.5rem)"
            color="#f38ba8"
            fontWeight={600}
            cursor="pointer"
            fontSize="clamp(0.72rem, 0.75vw, 0.82rem)"
          >
            Delete Roof
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
