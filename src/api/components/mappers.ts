import type { PvModule } from "./types";

export interface PvModuleDimensionsMeters {
  widthMeters: number;
  heightMeters: number;
  depthMeters?: number;
}

export function getPvModuleDisplayName(module: PvModule) {
  return [module.manufacturer, module.model].filter(Boolean).join(" - ");
}

export function getPvModuleDimensionsMeters(
  module: PvModule,
): PvModuleDimensionsMeters | null {
  const { width_mm, height_mm, depth_mm } = module.specs;

  if (!width_mm || !height_mm) return null;

  return {
    widthMeters: width_mm / 1000,
    heightMeters: height_mm / 1000,
    depthMeters: depth_mm ? depth_mm / 1000 : undefined,
  };
}
