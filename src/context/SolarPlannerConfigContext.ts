import { createContext, useContext } from "react";
import type { SystemContext } from "@chakra-ui/react";
import { defaultSolarPlannerSystem } from "../theme";

export interface SolarPlannerConfig {
  googleMapsApiKey: string;
  solarApiBaseUrl?: string;
  solarApiHeaders?: HeadersInit;
  /** Initial maximum installed capacity for the scene, in watts. */
  maxCapacityWatts?: number;
  /** Rated output of a single solar panel, in watts. */
  panelWattage: number;
  system: SystemContext;
}

export const DEFAULT_PANEL_WATTAGE = 400;

export const SolarPlannerConfigContext = createContext<SolarPlannerConfig>({
  googleMapsApiKey: "",
  panelWattage: DEFAULT_PANEL_WATTAGE,
  system: defaultSolarPlannerSystem,
});

export function useSolarPlannerConfig() {
  return useContext(SolarPlannerConfigContext);
}
