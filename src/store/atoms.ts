import { atom } from "jotai";
import type {
  RoofData,
  RoofStyle,
  DrawingMode,
  CanvasState,
  SelectionState,
  RoofStyleType,
  GeoPosition,
  MapState,
  ChimneyData,
  ChimneyShape,
  TreeData,
} from "../types";


export const roofStylesAtom = atom<RoofStyle[]>([
  { id: "flat", name: "Flat Roof", icon: "⬜" },
  { id: "gable", name: "Gable Roof", icon: "🏠" },
  { id: "hip", name: "Hip Roof", icon: "🔺" },
  { id: "shed", name: "Shed Roof", icon: "📐" },
  { id: "mansard", name: "Mansard Roof", icon: "🏛️" },
]);


export const selectedRoofStyleAtom = atom<RoofStyleType>("gable");


export const roofsAtom = atom<RoofData[]>([]);


export const selectedRoofIdAtom = atom<string | null>(null);


export const selectionStateAtom = atom<SelectionState>({
  type: null,
  roofId: null,
});


export const drawingModeAtom = atom<DrawingMode>("select");


export const canvasStateAtom = atom<CanvasState>({
  zoom: 1,
  panX: 0,
  panY: 0,
});


export const showGridAtom = atom<boolean>(true);


export const gridSizeAtom = atom<number>(20);


export const backgroundImageUrlAtom = atom<string | null>(null);


const DEFAULT_CENTER: GeoPosition = { lat: -1.179136, lng: 34.632383 };
export const MIN_GOOGLE_MAP_ZOOM = 1;
export const FALLBACK_MAX_GOOGLE_MAP_ZOOM = 21;
export const INITIAL_MAP_ZOOM = 20;
export const INITIAL_ORTHO_ZOOM = 50;

export function clampMapZoom(
  zoom: number,
  maxZoom = FALLBACK_MAX_GOOGLE_MAP_ZOOM,
): number {
  return Math.max(MIN_GOOGLE_MAP_ZOOM, Math.min(maxZoom, zoom));
}

export function mapZoomToOrthoZoom(zoom: number): number {
  return INITIAL_ORTHO_ZOOM * Math.pow(2, zoom - INITIAL_MAP_ZOOM);
}


export function computeMetersPerPixel(zoom: number, lat: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}


// Convert a Three.js plan-view offset (meters) back to geographic coordinates.
// +X is east and +Z is south in the editor's plan view.
const WGS84_A = 6378137;
const WGS84_E2 = 6.6943799901413165e-3;

export function worldOffsetToGeo(
  anchor: GeoPosition,
  eastMeters: number,
  southMeters: number,
): GeoPosition {
  const latRad = (anchor.lat * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  const w = Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const primeVerticalRadius = WGS84_A / w;
  const meridionalRadius =
    (WGS84_A * (1 - WGS84_E2)) /
    Math.pow(1 - WGS84_E2 * sinLat * sinLat, 1.5);

  const northMeters = -southMeters;
  const newLat =
    anchor.lat + (northMeters / meridionalRadius) * (180 / Math.PI);
  const newLatRad = (newLat * Math.PI) / 180;
  const newSinLat = Math.sin(newLatRad);
  const newW = Math.sqrt(1 - WGS84_E2 * newSinLat * newSinLat);
  const newPrimeVerticalRadius = WGS84_A / newW;
  const longitudeScale = newPrimeVerticalRadius * Math.cos(newLatRad);
  const newLng =
    anchor.lng + (eastMeters / longitudeScale) * (180 / Math.PI);

  return { lat: newLat, lng: newLng };
}


export const worldOriginGeoAtom = atom<GeoPosition>(DEFAULT_CENTER);


export const mapCenterAtom = atom<GeoPosition>(DEFAULT_CENTER);


export const mapZoomAtom = atom<number>(INITIAL_MAP_ZOOM);


export const mapMaxZoomAtom = atom<number>(FALLBACK_MAX_GOOGLE_MAP_ZOOM);


export const mapStateAtom = atom<MapState>((get) => {
  const center = get(mapCenterAtom);
  const zoom = get(mapZoomAtom);
  return {
    center,
    zoom,
    metersPerPixel: computeMetersPerPixel(zoom, center.lat),
  };
});


export const metersPerUnitAtom = atom<number>((get) => {
  const worldOrigin = get(worldOriginGeoAtom);


  return INITIAL_ORTHO_ZOOM * computeMetersPerPixel(INITIAL_MAP_ZOOM, worldOrigin.lat);
});


export const selectedRoofAtom = atom((get) => {
  const roofs = get(roofsAtom);
  const selectedId = get(selectedRoofIdAtom);
  return roofs.find((roof) => roof.id === selectedId) || null;
});


export const addRoofAtom = atom(null, (get, set, roof: RoofData) => {
  const roofs = get(roofsAtom);
  set(roofsAtom, [...roofs, roof]);
});


export const updateRoofAtom = atom(null, (get, set, updatedRoof: RoofData) => {
  const roofs = get(roofsAtom);
  set(
    roofsAtom,
    roofs.map((roof) => (roof.id === updatedRoof.id ? updatedRoof : roof)),
  );
});


export const deleteRoofAtom = atom(null, (get, set, roofId: string) => {
  const roofs = get(roofsAtom);
  const chimneys = get(chimneysAtom);


  set(
    roofsAtom,
    roofs.filter((roof) => roof.id !== roofId),
  );


  set(
    chimneysAtom,
    chimneys.filter((chimney) => chimney.roofId !== roofId),
  );

  const selectedId = get(selectedRoofIdAtom);
  if (selectedId === roofId) {
    set(selectedRoofIdAtom, null);
    set(selectionStateAtom, { type: null, roofId: null });
  }
});


export const mergeModeAtom = atom<boolean>(false);
export const mergeSourceRoofIdAtom = atom<string | null>(null);


export const mergeRoofsAtom = atom(
  null,
  (
    get,
    set,
    {
      sourceId,
      targetId,
      connectionType,
    }: {
      sourceId: string;
      targetId: string;
      connectionType: "endpoint" | "perpendicular";
    },
  ) => {
    const roofs = get(roofsAtom);
    const sourceRoof = roofs.find((r) => r.id === sourceId);
    const targetRoof = roofs.find((r) => r.id === targetId);

    if (!sourceRoof || !targetRoof) return;


    const updatedSource: RoofData = {
      ...sourceRoof,
      mergedWith: [...(sourceRoof.mergedWith || []), targetId],
      centerLine: {
        ...sourceRoof.centerLine,
        connectedToRoofId: targetId,
        connectionType,
      },
    };


    const updatedTarget: RoofData = {
      ...targetRoof,
      mergedWith: [...(targetRoof.mergedWith || []), sourceId],
    };

    set(
      roofsAtom,
      roofs.map((roof) => {
        if (roof.id === sourceId) return updatedSource;
        if (roof.id === targetId) return updatedTarget;
        return roof;
      }),
    );
  },
);


export const unmergeRoofsAtom = atom(
  null,
  (
    get,
    set,
    { sourceId, targetId }: { sourceId: string; targetId: string },
  ) => {
    const roofs = get(roofsAtom);

    set(
      roofsAtom,
      roofs.map((roof) => {
        if (roof.id === sourceId) {
          return {
            ...roof,
            mergedWith: (roof.mergedWith || []).filter((id) => id !== targetId),
            centerLine: {
              ...roof.centerLine,
              connectedToRoofId:
                roof.centerLine.connectedToRoofId === targetId
                  ? undefined
                  : roof.centerLine.connectedToRoofId,
              connectionType:
                roof.centerLine.connectedToRoofId === targetId
                  ? undefined
                  : roof.centerLine.connectionType,
            },
          };
        }
        if (roof.id === targetId) {
          return {
            ...roof,
            mergedWith: (roof.mergedWith || []).filter((id) => id !== sourceId),
          };
        }
        return roof;
      }),
    );
  },
);


const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
export const sunDateAtom = atom<string>(
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
);


export const sunTimeAtom = atom<string>("09:00");


export const chimneysAtom = atom<ChimneyData[]>([]);


export const selectedChimneyIdAtom = atom<string | null>(null);


export const selectedChimneyShapeAtom = atom<ChimneyShape>("rectangular");


export const selectedChimneyAtom = atom((get) => {
  const chimneys = get(chimneysAtom);
  const selectedId = get(selectedChimneyIdAtom);
  return chimneys.find((chimney) => chimney.id === selectedId) || null;
});


export const chimneysByRoofIdAtom = atom((get) => {
  const chimneys = get(chimneysAtom);
  return (roofId: string) => chimneys.filter((c) => c.roofId === roofId);
});


export const addChimneyAtom = atom(null, (get, set, chimney: ChimneyData) => {
  const chimneys = get(chimneysAtom);
  set(chimneysAtom, [...chimneys, chimney]);
});


export const updateChimneyAtom = atom(
  null,
  (get, set, updatedChimney: ChimneyData) => {
    const chimneys = get(chimneysAtom);
    set(
      chimneysAtom,
      chimneys.map((chimney) =>
        chimney.id === updatedChimney.id ? updatedChimney : chimney
      )
    );
  }
);


export const deleteChimneyAtom = atom(null, (get, set, chimneyId: string) => {
  const chimneys = get(chimneysAtom);
  set(
    chimneysAtom,
    chimneys.filter((chimney) => chimney.id !== chimneyId)
  );
  const selectedId = get(selectedChimneyIdAtom);
  if (selectedId === chimneyId) {
    set(selectedChimneyIdAtom, null);
  }
});


export const deleteChimneysByRoofIdAtom = atom(
  null,
  (get, set, roofId: string) => {
    const chimneys = get(chimneysAtom);
    set(
      chimneysAtom,
      chimneys.filter((chimney) => chimney.roofId !== roofId)
    );
  }
);


export const treesAtom = atom<TreeData[]>([]);


export const selectedTreeIdAtom = atom<string | null>(null);


export const selectedTreeAtom = atom((get) => {
  const trees = get(treesAtom);
  const selectedId = get(selectedTreeIdAtom);
  return trees.find((tree) => tree.id === selectedId) || null;
});


export const addTreeAtom = atom(null, (get, set, tree: TreeData) => {
  const trees = get(treesAtom);
  set(treesAtom, [...trees, tree]);
});


export const updateTreeAtom = atom(
  null,
  (get, set, updatedTree: TreeData) => {
    const trees = get(treesAtom);
    set(
      treesAtom,
      trees.map((tree) => (tree.id === updatedTree.id ? updatedTree : tree))
    );
  }
);


export const deleteTreeAtom = atom(null, (get, set, treeId: string) => {
  const trees = get(treesAtom);
  set(
    treesAtom,
    trees.filter((tree) => tree.id !== treeId)
  );
  const selectedId = get(selectedTreeIdAtom);
  if (selectedId === treeId) {
    set(selectedTreeIdAtom, null);
  }
});


export type ActivePanel = 'roof' | 'solar' | 'sun' | 'tree' | 'chimney' | null;
export const activePanelAtom = atom<ActivePanel>('roof');

export type RoofPanelTab = 'roof' | 'solar' | 'chimney';
export const roofPanelTabAtom = atom<RoofPanelTab>('roof');


export const fullscreenViewAtom = atom<'3d' | 'elevation' | null>(null);

// Solar sizing --------------------------------------------------------------

/** Monthly production used for the initial system-size estimate. */
export const MONTHLY_SOLAR_YIELD_KWH_PER_KW = 120;
export const SIZING_DAYS_PER_MONTH = 30;

export const DEFAULT_DAILY_ENERGY_TARGET_KWH = 1000;

/** Estimated monthly energy produced by a DC system at the sizing yield. */
export function calculateMonthlyProductionKwh(capacityWatts: number): number {
  if (!Number.isFinite(capacityWatts) || capacityWatts <= 0) return 0;
  return (capacityWatts / 1000) * MONTHLY_SOLAR_YIELD_KWH_PER_KW;
}

/** Estimated daily energy produced by a DC system at the sizing yield. */
export function calculateDailyProductionKwh(capacityWatts: number): number {
  return calculateMonthlyProductionKwh(capacityWatts) / SIZING_DAYS_PER_MONTH;
}

/** DC capacity required to satisfy a daily energy target at the sizing yield. */
export function calculateCapacityWattsForDailyProductionKwh(
  dailyProductionKwh: number,
): number {
  if (!Number.isFinite(dailyProductionKwh) || dailyProductionKwh <= 0) return 0;
  return (
    (dailyProductionKwh * SIZING_DAYS_PER_MONTH * 1000) /
    MONTHLY_SOLAR_YIELD_KWH_PER_KW
  );
}

export const maxCapacityWattsAtom = atom<number>(0);
