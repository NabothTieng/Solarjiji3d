import { atom } from "jotai";

export interface MergeConnection {
  rectId: string;
  handle: "start" | "end" | "midpoint";
  t?: number;
}

export type EndCapType = "flat" | "pointed";

export type RoofType = "flat" | "hip" | "shed" | "gambrel";
export type ShedDirection = "left" | "right";

export const ROOF_TYPE_OPTIONS: {
  id: RoofType;
  name: string;
  description: string;
}[] = [
  { id: "flat", name: "Flat", description: "No slope, level roof surface" },
  {
    id: "hip",
    name: "Hip",
    description: "All sides slope downward from the ridge",
  },
  {
    id: "shed",
    name: "Shed",
    description: "Single slope — one side high, the other low (lean-to)",
  },

];

export interface Rectangle3D {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  depth: number;

  polygonFootprint?: [number, number, number][];
  color: string;
  mergeStart?: MergeConnection;
  mergeEnd?: MergeConnection;
  startCap: EndCapType;
  endCap: EndCapType;
  roofType: RoofType;
  shedDirection?: ShedDirection;
  wallHeight: number;
  pitchAngle: number;
}

export type InteractionMode = "select" | "draw" | "drag";

export type SidebarTool =
  | "select"
  | "draw"
  | "tree"
  | "chimney"
  | "delete"
  | string;
export const activeToolAtom = atom<SidebarTool>("select");

export const rectanglesAtom = atom<Rectangle3D[]>([]);
export const selectedRectangleIdAtom = atom<string | null>(null);
export const interactionModeAtom = atom<InteractionMode>("select");
export const isDrawingActiveAtom = atom(false);
export const isDraggingHandleAtom = atom(false);

export const selectedRectangleAtom = atom((get) => {
  const rects = get(rectanglesAtom);
  const selectedId = get(selectedRectangleIdAtom);
  return rects.find((r) => r.id === selectedId) || null;
});


export function getRectCenter(rect: Rectangle3D): [number, number, number] {
  return [
    (rect.start[0] + rect.end[0]) / 2,
    0,
    (rect.start[2] + rect.end[2]) / 2,
  ];
}

export function getRectWidth(rect: Rectangle3D): number {
  const dx = rect.end[0] - rect.start[0];
  const dz = rect.end[2] - rect.start[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function getRectRotation(rect: Rectangle3D): number {
  return Math.atan2(
    -(rect.end[2] - rect.start[2]),
    rect.end[0] - rect.start[0],
  );
}


export type ChimneyShape = "rectangular" | "circular";

export interface Chimney3D {
  id: string;
  rectangleId: string;
  shape: ChimneyShape;


  localX: number;
  localZ: number;

  width: number;
  depth: number;
  height: number;

  color: string;
  model?: TreeModel;
}

export const chimneysAtom = atom<Chimney3D[]>([]);
export const selectedChimneyIdAtom = atom<string | null>(null);
export const selectedChimneyShapeAtom = atom<ChimneyShape>("rectangular");

export const selectedChimneyAtom = atom((get) => {
  const chimneys = get(chimneysAtom);
  const selectedId = get(selectedChimneyIdAtom);
  return chimneys.find((c) => c.id === selectedId) || null;
});


export const getChimneysForRectangle = (
  chimneys: Chimney3D[],
  rectangleId: string,
) => {
  return chimneys.filter((c) => c.rectangleId === rectangleId);
};


export function getChimneyWorldPosition(
  rect: Rectangle3D,
  chimney: Chimney3D,
): [number, number, number] {
  const rotation = getRectRotation(rect);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);


  const centerX = (rect.start[0] + rect.end[0]) / 2;
  const centerZ = (rect.start[2] + rect.end[2]) / 2;


  const worldX = centerX + chimney.localX * cos - chimney.localZ * sin;
  const worldZ = centerZ - chimney.localX * sin - chimney.localZ * cos;

  return [worldX, 0, worldZ];
}


export function getChimneyLocalPosition(
  rect: Rectangle3D,
  worldX: number,
  worldZ: number,
): { localX: number; localZ: number } {
  const rotation = getRectRotation(rect);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);


  const centerX = (rect.start[0] + rect.end[0]) / 2;
  const centerZ = (rect.start[2] + rect.end[2]) / 2;


  const relX = worldX - centerX;
  const relZ = worldZ - centerZ;


  const localX = relX * cos - relZ * sin;
  const localZ = -relX * sin - relZ * cos;

  return { localX, localZ };
}


export type TreeModel = "pine" | "jacaranda";

export interface Tree3D {
  id: string;

  position: [number, number, number];

  radius: number;
  height: number;

  color: string;
  model?: TreeModel;
}

export const trees3DAtom = atom<Tree3D[]>([]);
export const selectedTreeIdAtom = atom<string | null>(null);

export const selectedTreeAtom = atom((get) => {
  const trees = get(trees3DAtom);
  const selectedId = get(selectedTreeIdAtom);
  return trees.find((t) => t.id === selectedId) || null;
});

export interface TreeDimensionsMeters {
  canopyRadius: number;
  height: number;
}

export const lastTreeDimensionsAtom = atom<TreeDimensionsMeters>({
  canopyRadius: 1.5,
  height: 4,
});

export const treeModelAtom = atom<TreeModel>("pine");
