import SunCalc from "suncalc";
import type { RenderedPanelEntry } from "../store/solarPanelStore";

// ---------------------------------------------------------------------------
// Installed capacity
// ---------------------------------------------------------------------------

/** Total number of rendered panels across every roof side. */
export function countRenderedPanels(
  renderedPanels: Map<string, RenderedPanelEntry>,
): number {
  let n = 0;
  for (const entry of renderedPanels.values()) n += entry.panels.length;
  return n;
}

export function sumRenderedPanelWatts(
  renderedPanels: Map<string, RenderedPanelEntry>,
  fallbackPanelWattage: number,
): number {
  let totalWatts = 0;
  for (const entry of renderedPanels.values()) {
    const panelWattage =
      typeof entry.panelWattage === "number" && entry.panelWattage > 0
        ? entry.panelWattage
        : fallbackPanelWattage;
    totalWatts += entry.panels.length * panelWattage;
  }
  return totalWatts;
}

export interface CapacityStatus {
  panelCount: number;
  panelWattage: number;
  /** Installed capacity in watts (panelCount × panelWattage). */
  installedWatts: number;
  /** The configured target in watts, or undefined when no target is set. */
  maxCapacityWatts?: number;
  /** Whole-panel capacity that satisfies the target without requiring fractions. */
  roundedCapacityWatts?: number;
  /** True when installedWatts exceeds the rounded whole-panel capacity. */
  exceeded: boolean;
  /** Watts over the cap (0 when not exceeded / no cap). */
  excessWatts: number;
  /** How many panels are beyond what the cap allows (0 when not exceeded). */
  excessPanels: number;
}

export function computeCapacityStatus(
  panelCount: number,
  panelWattage: number,
  maxCapacityWatts?: number,
  installedWattsOverride?: number,
): CapacityStatus {
  const installedWatts = installedWattsOverride ?? panelCount * panelWattage;
  const effectivePanelWattage =
    panelCount > 0 && installedWatts > 0
      ? installedWatts / panelCount
      : panelWattage;
  const hasCap = typeof maxCapacityWatts === "number" && maxCapacityWatts > 0;
  const roundedCapacityWatts =
    hasCap && effectivePanelWattage > 0
      ? Math.ceil(maxCapacityWatts / effectivePanelWattage) *
        effectivePanelWattage
      : undefined;
  const excessWatts =
    roundedCapacityWatts !== undefined
      ? Math.max(0, installedWatts - roundedCapacityWatts)
      : 0;
  return {
    panelCount,
    panelWattage: effectivePanelWattage,
    installedWatts,
    maxCapacityWatts: hasCap ? maxCapacityWatts : undefined,
    roundedCapacityWatts,
    exceeded: excessWatts > 0,
    excessWatts,
    excessPanels:
      effectivePanelWattage > 0
        ? Math.ceil(excessWatts / effectivePanelWattage)
        : 0,
  };
}

// ---------------------------------------------------------------------------
// Daily energy generation, estimated from the map coordinates
// ---------------------------------------------------------------------------

const SOLAR_CONSTANT = 1353; // W/m² at the top of the atmosphere
// Fraction of DC nameplate capacity actually delivered (soiling, inverter,
// wiring, temperature losses). A conventional whole-system value.
const PERFORMANCE_RATIO = 0.75;
// Sampling step when integrating irradiance over a representative day.
const STEP_MINUTES = 20;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Klein's recommended "average" day-of-month for insolation calculations.
const REP_DAY = [17, 16, 16, 15, 15, 11, 17, 16, 15, 15, 14, 10];

/**
 * Clear-sky global horizontal irradiance (W/m²) for a given sun altitude,
 * using the Kasten-Young air-mass model with a simple diffuse allowance.
 */
function clearSkyGHI(altitudeRad: number): number {
  if (altitudeRad <= 0) return 0;
  const sinAlt = Math.sin(altitudeRad);
  const altDeg = (altitudeRad * 180) / Math.PI;
  const airMass =
    1 / (sinAlt + 0.50572 * Math.pow(6.07995 + altDeg, -1.6364));
  const dni = SOLAR_CONSTANT * Math.pow(0.7, Math.pow(airMass, 0.678));
  // Beam contribution on a horizontal surface plus ~10% diffuse.
  return dni * sinAlt * 1.1;
}

export interface MonthlyEnergyRow {
  month: string;
  /** Peak sun hours = daily insolation in kWh/m² (STC is 1 kW/m²). */
  peakSunHours: number;
  /** Estimated AC energy produced per day, in kWh. */
  kWhPerDay: number;
}

/**
 * Estimate the energy generated per day, month by month, for a system of the
 * given wattage at the given coordinates. Irradiance is integrated over a
 * representative day of each month, so the result varies with latitude and the
 * day length at that location.
 */
export function computeMonthlyEnergy(
  lat: number,
  lng: number,
  systemWatts: number,
): MonthlyEnergyRow[] {
  const systemKW = systemWatts / 1000;
  const stepHours = STEP_MINUTES / 60;
  const year = new Date().getFullYear();
  const rows: MonthlyEnergyRow[] = [];

  for (let m = 0; m < 12; m++) {
    let whPerM2 = 0;
    for (let minute = 0; minute < 24 * 60; minute += STEP_MINUTES) {
      const date = new Date(year, m, REP_DAY[m], 0, 0, 0, 0);
      date.setMinutes(minute);
      const pos = SunCalc.getPosition(date, lat, lng);
      whPerM2 += clearSkyGHI(pos.altitude) * stepHours;
    }
    const peakSunHours = whPerM2 / 1000; // kWh/m² == peak sun hours
    rows.push({
      month: MONTH_LABELS[m],
      peakSunHours,
      kWhPerDay: systemKW * peakSunHours * PERFORMANCE_RATIO,
    });
  }
  return rows;
}
