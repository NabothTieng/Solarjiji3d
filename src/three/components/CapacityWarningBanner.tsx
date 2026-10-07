import { useAtomValue } from "jotai";
import { Box, Flex, Text } from "@chakra-ui/react";
import { TriangleAlert } from "lucide-react";
import { renderedPanelsAtom } from "../store/solarPanelStore";
import {
  calculateMonthlyProductionKwh,
  maxCapacityWattsAtom,
} from "../../store/atoms";
import { useSolarPlannerConfig } from "../../context/SolarPlannerConfigContext";
import {
  computeCapacityStatus,
  countRenderedPanels,
  sumRenderedPanelWatts,
} from "../helpers/energyReport";

/**
 * Non-blocking banner shown when the installed panel wattage exceeds the
 * scene's configured target capacity. Panels can still be added; this only
 * warns that they are more than needed.
 */
export function CapacityWarningBanner() {
  const { panelWattage } = useSolarPlannerConfig();
  const renderedPanels = useAtomValue(renderedPanelsAtom);
  const maxCapacityWatts = useAtomValue(maxCapacityWattsAtom);

  const status = computeCapacityStatus(
    countRenderedPanels(renderedPanels),
    panelWattage,
    maxCapacityWatts,
    sumRenderedPanelWatts(renderedPanels, panelWattage),
  );

  if (!status.exceeded) return null;

  const estimatedMonthlyProduction = calculateMonthlyProductionKwh(
    status.installedWatts,
  );
  const monthlyEnergyTarget = calculateMonthlyProductionKwh(
    status.maxCapacityWatts!,
  );

  return (
    <Flex
      position="fixed"
      top={4}
      left="50%"
      transform="translateX(-50%)"
      zIndex={1100}
      maxW="min(560px, 90vw)"
      align="flex-start"
      gap={3}
      px={4}
      py={3}
      borderRadius="lg"
      bg="#5af94f"
      color="#1e1e2e"
      boxShadow="0 6px 20px rgba(0,0,0,0.35)"
      borderWidth="1px"
      borderColor="#e0a800"
    >
      <Box pt="2px" flexShrink={0}>
        <TriangleAlert size={20} strokeWidth={2} />
      </Box>
      <Box>
        <Text fontWeight="700" fontSize="sm">
          Monthly energy target achieved
        </Text>
        <Text fontSize="sm" lineHeight={1.4}>
          These panels produce about {estimatedMonthlyProduction.toFixed(1)}
          {" kWh/month"} against the {monthlyEnergyTarget.toFixed(1)} kWh
          monthly
        </Text>
      </Box>
    </Flex>
  );
}
