import { useMemo, useState } from "react";
import {
  getPvModuleDimensionsMeters,
  usePvModulesQuery,
  type PvModule,
  type PvModuleDimensionsMeters,
} from "../../../api/components";

const PV_MODULE_CATALOG_LIMIT = 100;

export interface PvModuleSelection {
  selectedModuleId: string;
  setSelectedModuleId: (id: string) => void;
  pvModules: PvModule[];
  filteredPvModules: PvModule[];
  pvModulesQuery: ReturnType<typeof usePvModulesQuery>;
  providers: string[];
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  moduleSearch: string;
  setModuleSearch: (search: string) => void;
  minPowerWatts: string;
  setMinPowerWatts: (watts: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (verifiedOnly: boolean) => void;
  selectedPvModule: PvModule | undefined;
  selectedPvModuleDimensions: PvModuleDimensionsMeters | null;
}

export function usePvModuleSelection(enabled: boolean): PvModuleSelection {
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [minPowerWatts, setMinPowerWatts] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const pvModulesQuery = usePvModulesQuery(
    { limit: PV_MODULE_CATALOG_LIMIT, search: undefined },
    { enabled },
  );
  const pvModules = useMemo(
    () => pvModulesQuery.data?.items ?? [],
    [pvModulesQuery.data],
  );
  const providers = useMemo(
    () =>
      Array.from(
        new Set(
          pvModules.map((module) => module.manufacturer.trim()).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [pvModules],
  );
  const filteredPvModules = useMemo(() => {
    const normalizedSearch = moduleSearch.trim().toLowerCase();
    const minPower = Number(minPowerWatts);
    const hasMinPower = Number.isFinite(minPower) && minPower > 0;

    return pvModules.filter((module) => {
      const modulePower = module.specs.at_stc?.pmax_w;
      const providerMatches =
        !selectedProvider || module.manufacturer === selectedProvider;
      const searchMatches =
        !normalizedSearch ||
        [module.manufacturer, module.model, module.series, module.region]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedSearch));
      const powerMatches =
        !hasMinPower ||
        (typeof modulePower === "number" && modulePower >= minPower);
      const verifiedMatches = !verifiedOnly || module.is_verified;

      return (
        providerMatches && searchMatches && powerMatches && verifiedMatches
      );
    });
  }, [minPowerWatts, moduleSearch, pvModules, selectedProvider, verifiedOnly]);
  const defaultPvModule = useMemo(
    () =>
      filteredPvModules.find((module) => getPvModuleDimensionsMeters(module)) ??
      filteredPvModules[0],
    [filteredPvModules],
  );
  const selectedPvModule = useMemo(
    () =>
      filteredPvModules.find(
        (module) => module.component_id === selectedModuleId,
      ) ?? defaultPvModule,
    [defaultPvModule, filteredPvModules, selectedModuleId],
  );
  const selectedPvModuleDimensions = selectedPvModule
    ? getPvModuleDimensionsMeters(selectedPvModule)
    : null;

  return {
    selectedModuleId,
    setSelectedModuleId,
    pvModules,
    filteredPvModules,
    pvModulesQuery,
    providers,
    selectedProvider,
    setSelectedProvider,
    moduleSearch,
    setModuleSearch,
    minPowerWatts,
    setMinPowerWatts,
    verifiedOnly,
    setVerifiedOnly,
    selectedPvModule,
    selectedPvModuleDimensions,
  };
}
