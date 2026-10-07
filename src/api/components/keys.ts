import type { ComponentsQueryParams } from "./types";

export const componentQueryKeys = {
  all: ["components"] as const,
  lists: () => [...componentQueryKeys.all, "list"] as const,
  list: (params: ComponentsQueryParams) =>
    [...componentQueryKeys.lists(), params] as const,
  pvModules: (params: ComponentsQueryParams) =>
    componentQueryKeys.list({ ...params, type: "pv_module" }),
};
