import { useAtomValue } from "jotai";
import { useCallback } from "react";
import {
  mapCenterAtom,
  mapZoomAtom,
  maxCapacityWattsAtom,
  metersPerUnitAtom,
} from "../store/atoms";
import { rectanglesAtom, chimneysAtom, trees3DAtom } from "../three/store/rectangleStore";
import {
  renderedPanelsAtom,
  solarPanelConfigsAtom,
} from "../three/store/solarPanelStore";
import { lotsAtom } from "../three/store/lotStore";
import { buildPanelReport } from "../three/helpers/panelReport";
import type { SolarPlannerData } from "../types/solar-planner";

export function useCollectPlannerData(): () => SolarPlannerData {
  const rectangles = useAtomValue(rectanglesAtom);
  const solarPanelConfigs = useAtomValue(solarPanelConfigsAtom);
  const chimneys = useAtomValue(chimneysAtom);
  const trees = useAtomValue(trees3DAtom);
  const lots = useAtomValue(lotsAtom);
  const mapCenter = useAtomValue(mapCenterAtom);
  const mapZoom = useAtomValue(mapZoomAtom);
  const renderedPanels = useAtomValue(renderedPanelsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const maxCapacityWatts = useAtomValue(maxCapacityWattsAtom);

  return useCallback(
    () => ({
      rectangles,
      solarPanelConfigs,
      chimneys,
      trees,
      lots,
      mapCenter,
      mapZoom,
      panelReport: buildPanelReport(renderedPanels, metersPerUnit),
      maxCapacityWatts,
    }),
    [
      rectangles,
      solarPanelConfigs,
      chimneys,
      trees,
      lots,
      mapCenter,
      mapZoom,
      renderedPanels,
      metersPerUnit,
      maxCapacityWatts,
    ],
  );
}
