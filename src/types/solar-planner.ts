import type { GeoPosition } from "./index";
import type { Rectangle3D, Chimney3D, Tree3D } from "../three/store/rectangleStore";
import type { SolarPanelConfig } from "../three/store/solarPanelStore";
import type { Lot3D } from "../three/store/lotStore";
import type { PanelReportRow } from "../three/helpers/panelReport";
import type { ThemeConfig } from "../theme";

export interface SolarPlannerData {
  rectangles: Rectangle3D[];
  solarPanelConfigs: SolarPanelConfig[];
  chimneys: Chimney3D[];
  trees: Tree3D[];
  lots: Lot3D[];
  mapCenter: GeoPosition;
  mapZoom: number;
  panelReport: PanelReportRow[];
  /** Installed-capacity sizing target for the scene, in watts. */
  maxCapacityWatts: number;
}

export interface SolarPlannerProps {
  googleMapsApiKey: string;
  solarApiBaseUrl?: string;
  solarApiHeaders?: HeadersInit;
  defaultCenter?: GeoPosition;
  defaultZoom?: number;
  initialData?: Partial<SolarPlannerData>;
  onSave?: (data: SolarPlannerData) => void;
  /**
   * Installed-capacity sizing target for the scene, in watts. When the total
   * installed wattage (panel count × {@link panelWattage}) exceeds this value
   * by more than the whole-panel allowance, the user receives a non-blocking
   * notice; additional panels remain allowed.
   */
  maxCapacityWatts?: number;
  /**
   * Daily energy sizing target for the scene, in kWh/day. When provided, the
   * planner converts it into the internal max-capacity target. If neither this
   * nor {@link maxCapacityWatts} is provided, the planner defaults to
   * 1000 kWh/day.
   */
  dailyEnergyTargetKwh?: number;
  /**
   * Rated output of a single solar panel, in watts. Used to compute installed
   * capacity and estimated energy generation (default: 400W).
   */
  panelWattage?: number;
  /**
   * Theme configuration for customizing colors and fonts.
   * @property primaryColor - Primary accent color (default: #ffa500 orange)
   * @property secondaryColor - Secondary/background color (default: #313244 gray)
   * @property fontFamily - Font family for the UI
   * @property fontSize - Base font size in pixels (default: 13)
   */
  theme?: ThemeConfig;
}
