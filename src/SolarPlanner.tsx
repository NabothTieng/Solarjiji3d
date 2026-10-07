import { useMemo } from "react";
import { Provider as JotaiProvider } from "jotai";
import type { SolarPlannerProps } from "./types/solar-planner";
import {
  SolarPlannerConfigContext,
  DEFAULT_PANEL_WATTAGE,
  useSolarPlannerConfig,
} from "./context/SolarPlannerConfigContext";
import { SaveHandlerContext } from "./context/SaveHandlerContext";
import { ThemeConfigContext } from "./context/ThemeConfigContext";
import { createSolarPlannerSystem } from "./theme";
import { useHydrateAtoms } from "./hooks/useHydrateAtoms";
import App from "./App";
import {
  calculateCapacityWattsForDailyProductionKwh,
} from "./store/atoms";

function SolarPlannerInner(props: SolarPlannerProps) {
  const { maxCapacityWatts } = useSolarPlannerConfig();
  useHydrateAtoms(
    props.initialData,
    props.defaultCenter,
    props.defaultZoom,
    maxCapacityWatts,
  );
  return <App />;
}

export function SolarPlanner(props: SolarPlannerProps) {
  const {
    googleMapsApiKey,
    solarApiBaseUrl,
    solarApiHeaders,
    maxCapacityWatts,
    dailyEnergyTargetKwh,
    panelWattage,
    onSave,
    theme,
    ...rest
  } = props;

  // Create chakra system based on theme config
  const system = useMemo(() => createSolarPlannerSystem(theme), [theme]);
  const configuredMaxCapacityWatts = useMemo(() => {
    if (typeof maxCapacityWatts === "number" && maxCapacityWatts > 0) {
      return maxCapacityWatts;
    }

    if (typeof dailyEnergyTargetKwh === "number" && dailyEnergyTargetKwh > 0) {
      return calculateCapacityWattsForDailyProductionKwh(dailyEnergyTargetKwh);
    }

    return undefined;
  }, [dailyEnergyTargetKwh, maxCapacityWatts]);

  return (
    <JotaiProvider>
      <ThemeConfigContext.Provider value={theme ?? {}}>
        <SolarPlannerConfigContext.Provider
          value={{
            googleMapsApiKey,
            solarApiBaseUrl,
            solarApiHeaders,
            maxCapacityWatts: configuredMaxCapacityWatts,
            panelWattage: panelWattage ?? DEFAULT_PANEL_WATTAGE,
            system,
          }}
        >
          <SaveHandlerContext.Provider value={onSave}>
            <SolarPlannerInner {...rest} googleMapsApiKey={googleMapsApiKey} />
          </SaveHandlerContext.Provider>
        </SolarPlannerConfigContext.Provider>
      </ThemeConfigContext.Provider>
    </JotaiProvider>
  );
}
