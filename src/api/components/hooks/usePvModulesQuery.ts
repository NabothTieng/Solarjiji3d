import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  DEFAULT_PV_MODULES_QUERY,
  fetchPvModules,
} from "../componentsApi";
import { componentQueryKeys } from "../keys";
import type { ComponentsQueryParams, PvModulesPage } from "../types";
import { useSolarPlannerConfig } from "../../../context/SolarPlannerConfigContext";

type PvModulesQueryOptions = Omit<
  UseQueryOptions<PvModulesPage, Error>,
  "queryKey" | "queryFn"
>;

export function usePvModulesQuery(
  params: ComponentsQueryParams = {},
  options?: PvModulesQueryOptions,
) {
  const { solarApiBaseUrl, solarApiHeaders } = useSolarPlannerConfig();
  const queryParams = {
    ...DEFAULT_PV_MODULES_QUERY,
    ...params,
    type: "pv_module" as const,
  };

  return useQuery({
    queryKey: [
      ...componentQueryKeys.pvModules(queryParams),
      solarApiBaseUrl,
    ] as const,
    queryFn: ({ signal }) =>
      fetchPvModules(queryParams, signal, {
        baseUrl: solarApiBaseUrl,
        headers: solarApiHeaders,
      }),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
