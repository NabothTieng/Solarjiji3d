import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import {
  DEFAULT_DAILY_ENERGY_TARGET_KWH,
  calculateCapacityWattsForDailyProductionKwh,
  mapCenterAtom,
  mapZoomAtom,
  maxCapacityWattsAtom,
  worldOriginGeoAtom,
} from "../store/atoms";
import { rectanglesAtom, chimneysAtom, trees3DAtom } from "../three/store/rectangleStore";
import { solarPanelConfigsAtom } from "../three/store/solarPanelStore";
import { lotsAtom } from "../three/store/lotStore";
import { resetHistoryAtom } from "../three/store/historyStore";
import type { SolarPlannerData } from "../types/solar-planner";
import type { GeoPosition } from "../types";

export function useHydrateAtoms(
  initialData: Partial<SolarPlannerData> | undefined,
  defaultCenter: GeoPosition | undefined,
  defaultZoom: number | undefined,
  initialMaxCapacityWatts: number | undefined,
) {
  const hydratedRef = useRef(false);

  const setRectangles = useSetAtom(rectanglesAtom);
  const setSolarPanelConfigs = useSetAtom(solarPanelConfigsAtom);
  const setChimneys = useSetAtom(chimneysAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setLots = useSetAtom(lotsAtom);
  const setMapCenter = useSetAtom(mapCenterAtom);
  const setMapZoom = useSetAtom(mapZoomAtom);
  const setWorldOrigin = useSetAtom(worldOriginGeoAtom);
  const setMaxCapacityWatts = useSetAtom(maxCapacityWattsAtom);
  const resetHistory = useSetAtom(resetHistoryAtom);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const center = initialData?.mapCenter ?? defaultCenter;
    const zoom = initialData?.mapZoom ?? defaultZoom;

    if (center) {
      setMapCenter(center);
      setWorldOrigin(center);
    }
    if (zoom !== undefined) {
      setMapZoom(zoom);
    }

    // Scene data
    if (initialData?.rectangles) {
      setRectangles(initialData.rectangles);
    }
    if (initialData?.solarPanelConfigs) {
      setSolarPanelConfigs(initialData.solarPanelConfigs);
    }
    if (initialData?.chimneys) {
      setChimneys(initialData.chimneys);
    }
    if (initialData?.trees) {
      setTrees(initialData.trees);
    }
    if (initialData?.lots) {
      setLots(initialData.lots);
    }

    const maxCapacityWatts =
      initialMaxCapacityWatts ??
      initialData?.maxCapacityWatts ??
      calculateCapacityWattsForDailyProductionKwh(
        DEFAULT_DAILY_ENERGY_TARGET_KWH,
      );
    if (maxCapacityWatts > 0) {
      setMaxCapacityWatts(maxCapacityWatts);
    }

    // Baseline history on the hydrated state so the load isn't undoable.
    resetHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
