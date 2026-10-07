import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Box, Button, Flex, HStack, Table, Text } from "@chakra-ui/react";
import {
  panelReportOpenAtom,
  renderedPanelsAtom,
} from "../store/solarPanelStore";
import {
  calculateMonthlyProductionKwh,
  metersPerUnitAtom,
  mapCenterAtom,
  maxCapacityWattsAtom,
} from "../../store/atoms";
import { buildPanelReport, type PanelReportRow } from "../helpers/panelReport";
import { useSolarPlannerConfig } from "../../context/SolarPlannerConfigContext";
import {
  computeCapacityStatus,
  computeMonthlyEnergy,
  countRenderedPanels,
  sumRenderedPanelWatts,
  type CapacityStatus,
  type MonthlyEnergyRow,
} from "../helpers/energyReport";


function buildCsv(
  rows: PanelReportRow[],
  status: CapacityStatus,
  monthly: MonthlyEnergyRow[],
  monthlyEnergyTarget: number,
): string {
  const escape = (v: string | number) => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines: string[] = [];

  // Capacity summary
  lines.push("Capacity summary");
  lines.push(["Panel count", status.panelCount].map(escape).join(","));
  lines.push(
    ["Average panel wattage (W)", status.panelWattage.toFixed(2)]
      .map(escape)
      .join(","),
  );
  lines.push(
    ["Installed capacity (W)", status.installedWatts].map(escape).join(","),
  );
  if (status.maxCapacityWatts !== undefined) {
    lines.push(
      ["Monthly energy target (kWh)", monthlyEnergyTarget]
        .map(escape)
        .join(","),
    );
    lines.push(
      ["Equivalent target capacity (W)", status.maxCapacityWatts]
        .map(escape)
        .join(","),
    );
    if (status.roundedCapacityWatts !== undefined) {
      lines.push(
        ["Whole-panel capacity limit (W)", status.roundedCapacityWatts]
          .map(escape)
          .join(","),
      );
    }
    lines.push(
      [
        "Status",
        status.exceeded
          ? `Exceeded by ${status.excessWatts} W (~${status.excessPanels} panels)`
          : "Within capacity",
      ]
        .map(escape)
        .join(","),
    );
  }
  lines.push("");

  // Estimated daily energy generation, per month, from the map coordinates
  lines.push("Estimated energy generation (from map coordinates)");
  lines.push(
    ["Month", "Peak sun hours (kWh/m²/day)", "Energy (kWh/day)"].join(","),
  );
  for (const m of monthly) {
    lines.push(
      [m.month, m.peakSunHours.toFixed(2), m.kWhPerDay.toFixed(2)]
        .map(escape)
        .join(","),
    );
  }
  lines.push("");

  // Panel list
  lines.push("Panels");
  const headers = [
    "Index",
    "Roof ID",
    "Side",
    "Width (m)",
    "Height (m)",
    "Tilt (°)",
    "Azimuth (°)",
  ];
  lines.push(headers.join(","));
  for (const r of rows) {
    lines.push(
      [
        r.index,
        r.roofId,
        r.sideIndex,
        r.widthM.toFixed(3),
        r.heightM.toFixed(3),
        r.tiltDeg.toFixed(2),
        r.azimuthDeg.toFixed(2),
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel detects UTF-8 correctly.
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PanelListButton() {
  const renderedPanels = useAtomValue(renderedPanelsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const mapCenter = useAtomValue(mapCenterAtom);
  const maxCapacityWatts = useAtomValue(maxCapacityWattsAtom);
  const { panelWattage } = useSolarPlannerConfig();
  const [isOpen, setIsOpen] = useAtom(panelReportOpenAtom);

  const rows = useMemo<PanelReportRow[]>(
    () => buildPanelReport(renderedPanels, metersPerUnit),
    [renderedPanels, metersPerUnit],
  );

  const totalCount = rows.length;

  const status = useMemo<CapacityStatus>(
    () =>
      computeCapacityStatus(
        countRenderedPanels(renderedPanels),
        panelWattage,
        maxCapacityWatts,
        sumRenderedPanelWatts(renderedPanels, panelWattage),
      ),
    [renderedPanels, panelWattage, maxCapacityWatts],
  );

  const monthly = useMemo<MonthlyEnergyRow[]>(
    () =>
      computeMonthlyEnergy(mapCenter.lat, mapCenter.lng, status.installedWatts),
    [mapCenter.lat, mapCenter.lng, status.installedWatts],
  );

  const avgKWhPerDay =
    monthly.reduce((s, m) => s + m.kWhPerDay, 0) / (monthly.length || 1);
  const monthlyEnergyTarget = calculateMonthlyProductionKwh(maxCapacityWatts);

  const handleExport = () => {
    const csv = buildCsv(rows, status, monthly, monthlyEnergyTarget);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCsv(`solar-panels-${stamp}.csv`, csv);
  };

  if (!isOpen) return null;

  return (
    <Flex
      position="fixed"
      inset={0}
      bg="rgba(0,0,0,0.45)"
          zIndex={1000}
          align="center"
          justify="center"
          onClick={() => setIsOpen(false)}
        >
          <Box
            width={{ base: "90vw", md: "min(900px, 90vw)" }}
            maxH="80vh"
            bg="#1e1e2e"
            color="#cdd6f4"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="#45475a"
            display="flex"
            flexDirection="column"
            overflow="hidden"
            fontSize="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Flex
              px={5}
              py={3}
              borderBottomWidth="1px"
              borderColor="#313244"
              align="center"
              justify="space-between"
            >
              <Text fontSize="md" fontWeight="600">
                Solar Panels — {totalCount} total
              </Text>
              <HStack gap={2}>
                <Button
                  size="sm"
                  bg="#89b4fa"
                  color="#1e1e2e"
                  fontWeight="600"
                  _hover={{ bg: "#a0c4ff" }}
                  onClick={handleExport}
                  disabled={totalCount === 0}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  borderColor="#45475a"
                  color="#cdd6f4"
                  _hover={{ bg: "#313244" }}
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
              </HStack>
            </Flex>

            {/* Capacity summary */}
            <Box
              px={5}
              py={3}
              borderBottomWidth="1px"
              borderColor="#313244"
            >
              <Flex gap={6} wrap="wrap" fontSize="sm">
                <Box>
                  <Text color="#a6adc8" fontSize="xs">
                    Installed capacity
                  </Text>
                  <Text fontWeight="600">
                    {(status.installedWatts / 1000).toFixed(2)} kW
                    <Text as="span" color="#6c7086" fontWeight="400">
                      {" "}
                      ({status.panelCount} × avg.{" "}
                      {status.panelWattage.toFixed(0)} W)
                    </Text>
                  </Text>
                </Box>
                {status.maxCapacityWatts !== undefined && (
                  <Box>
                    <Text color="#a6adc8" fontSize="xs">
                      Monthly energy target
                    </Text>
                    <Text fontWeight="600">
                      {monthlyEnergyTarget.toFixed(1)} kWh/month
                      {status.roundedCapacityWatts !== undefined && (
                        <Text as="span" color="#6c7086" fontWeight="400">
                          {" "}
                          ({Math.round(
                            status.roundedCapacityWatts / status.panelWattage,
                          )}{" "}
                          panels needed)
                        </Text>
                      )}
                    </Text>
                  </Box>
                )}
                <Box>
                  <Text color="#a6adc8" fontSize="xs">
                    Avg. daily generation
                  </Text>
                  <Text fontWeight="600">{avgKWhPerDay.toFixed(1)} kWh/day</Text>
                </Box>
              </Flex>
              {status.exceeded && (
                <Flex
                  mt={3}
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg="rgba(249,199,79,0.15)"
                  borderWidth="1px"
                  borderColor="#f9c74f"
                  color="#f9c74f"
                  fontSize="sm"
                >
                  <Text>
                    The design has about {status.excessPanels} more panel
                    {status.excessPanels === 1 ? "" : "s"} than the estimated
                    monthly energy need. Additional panels are still allowed.
                  </Text>
                </Flex>
              )}
            </Box>

            {/* Estimated energy generation by month (from map coordinates) */}
            <Box px={5} py={3} borderBottomWidth="1px" borderColor="#313244">
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Estimated energy generation
                <Text as="span" color="#6c7086" fontWeight="400">
                  {" "}
                  — {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                </Text>
              </Text>
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row bg="#313244">
                      <Table.ColumnHeader color="#a6adc8" px={3} py={1}>
                        Month
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={3} py={1}>
                        Peak sun hrs
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={3} py={1}>
                        Energy (kWh/day)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {monthly.map((m) => (
                      <Table.Row key={m.month} _hover={{ bg: "#2a2a3c" }}>
                        <Table.Cell px={3} py={1}>
                          {m.month}
                        </Table.Cell>
                        <Table.Cell px={3} py={1}>
                          {m.peakSunHours.toFixed(2)}
                        </Table.Cell>
                        <Table.Cell px={3} py={1}>
                          {m.kWhPerDay.toFixed(2)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>

            <Box flex={1} maxH="65vh" overflowY="auto" overflowX="auto">
              {totalCount === 0 ? (
                <Box py={10} px={5} textAlign="center" color="#6c7086">
                  No panels generated yet. Select a roof side and click
                  &ldquo;Generate panels&rdquo;.
                </Box>
              ) : (
                <Table.Root size="sm" stickyHeader>
                  <Table.Header>
                    <Table.Row bg="#313244">
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        #
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        Roof
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        Side
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        Width (m)
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        Height (m)
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        Tilt (°)
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="#a6adc8" px={4} py={1}>
                        Azimuth (°)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((r) => (
                      <Table.Row
                        key={`${r.roofSideKey}-${r.index}`}
                        _hover={{ bg: "#2a2a3c" }}
                        bg={"#000000"}
                        p={4}
                      >
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.index}
                        </Table.Cell>
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.roofId.slice(0, 8)}
                        </Table.Cell>
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.sideIndex}
                        </Table.Cell>
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.widthM.toFixed(2)}
                        </Table.Cell>
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.heightM.toFixed(2)}
                        </Table.Cell>
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.tiltDeg.toFixed(1)}
                        </Table.Cell>
                        <Table.Cell bg={"#313244"} px={4} py={1}>
                          {r.azimuthDeg.toFixed(1)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </Box>
          </Box>
        </Flex>
  );
}
