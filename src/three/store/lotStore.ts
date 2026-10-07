import { atom } from "jotai";


export interface Lot3D {
  id: string;

  corner1: [number, number, number];

  corner2: [number, number, number];

  polygonFootprint?: [number, number, number][];
  color: string;
}

export const lotsAtom = atom<Lot3D[]>([]);

export const selectedLotIdAtom = atom<string | null>(null);

export const selectedLotAtom = atom((get) => {
  const lots = get(lotsAtom);
  const id = get(selectedLotIdAtom);
  return lots.find((l) => l.id === id) ?? null;
});


export function getLotBounds(lot: Lot3D) {
  const points = lot.polygonFootprint?.length ? lot.polygonFootprint : [lot.corner1, lot.corner2];
  const minX = Math.min(...points.map((p) => p[0]));
  const maxX = Math.max(...points.map((p) => p[0]));
  const minZ = Math.min(...points.map((p) => p[2]));
  const maxZ = Math.max(...points.map((p) => p[2]));
  return { minX, maxX, minZ, maxZ };
}

export function getLotCenter(lot: Lot3D): [number, number, number] {
  const b = getLotBounds(lot);
  return [(b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2];
}

export function getLotSize(lot: Lot3D): { width: number; depth: number } {
  const b = getLotBounds(lot);
  return { width: b.maxX - b.minX, depth: b.maxZ - b.minZ };
}


export const LOT_SURFACE_Y = 0.005;


export function buildLotSurface(lot: Lot3D): {
  vertices: number[];
  indices: number[];
  normal: [number, number, number];
} {
  if (lot.polygonFootprint && lot.polygonFootprint.length >= 3) {
    const y = LOT_SURFACE_Y;
    const vertices = lot.polygonFootprint.flatMap((p) => [p[0], y, p[2]]);
    const indices: number[] = [];
    for (let i = 1; i < lot.polygonFootprint.length - 1; i++) {
      indices.push(0, i, i + 1);
    }
    return { vertices, indices, normal: [0, 1, 0] };
  }

  const { minX, maxX, minZ, maxZ } = getLotBounds(lot);
  const y = LOT_SURFACE_Y;

  const vertices = [
    minX, y, minZ,
    maxX, y, minZ,
    maxX, y, maxZ,
    minX, y, maxZ,
  ];
  const indices = [0, 1, 2, 0, 2, 3];
  return { vertices, indices, normal: [0, 1, 0] };
}


export function lotRoofSideKey(lotId: string): string {
  return `lot:${lotId}:0`;
}


export function isLotRoofSideKey(roofSideKey: string, lotId?: string): boolean {
  if (!roofSideKey.startsWith("lot:")) return false;
  if (!lotId) return true;
  return roofSideKey.startsWith(`lot:${lotId}:`);
}
