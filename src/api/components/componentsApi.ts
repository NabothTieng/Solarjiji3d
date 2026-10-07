import { apiRequest } from "../http/apiClient";
import type { SolarApiConfig } from "../config";
import type { ComponentsQueryParams, PvModulesPage } from "./types";

export const DEFAULT_PV_MODULES_QUERY = {
  skip: 0,
  type: "pv_module",
  is_active: true,
} satisfies ComponentsQueryParams;

export function fetchPvModules(
  params: ComponentsQueryParams = {},
  signal?: AbortSignal,
  config?: SolarApiConfig,
) {
  return apiRequest<PvModulesPage>("/api/v1/components", {
    signal,
    params: {
      ...DEFAULT_PV_MODULES_QUERY,
      ...params,
      type: "pv_module",
    },
  }, config);
}
