import SunCalc from "suncalc";

export interface SunPosition {

  azimuth: number;

  altitude: number;
}

export interface SunLightParams {

  position: [number, number, number];

  intensity: number;

  isDay: boolean;
}


export function getSunPosition(
  date: Date,
  lat: number,
  lng: number,
): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lng);
  return {
    azimuth: pos.azimuth,
    altitude: pos.altitude,
  };
}


export function sunPositionToLightParams(
  sun: SunPosition,
  distance = 30,
): SunLightParams {
  const isDay = sun.altitude > 0;

  if (!isDay) {
    return { position: [0, 0.1, 0], intensity: 0.05, isDay: false };
  }


  const x = -distance * Math.cos(sun.altitude) * Math.sin(sun.azimuth);
  const y = distance * Math.sin(sun.altitude);
  const z = distance * Math.cos(sun.altitude) * Math.cos(sun.azimuth);


  const altNorm = sun.altitude / (Math.PI / 2);
  const intensity = 0.1 + 0.9 * Math.pow(altNorm, 0.4);

  return {
    position: [x, y, z],
    intensity: Math.min(intensity, 1.2),
    isDay,
  };
}


export function buildDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}
