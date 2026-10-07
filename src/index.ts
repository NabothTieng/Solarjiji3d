import type { ThreeEvent } from "@react-three/fiber";
import type { Rectangle3D } from "../three/store/rectangleStore";

export interface Point {
  x: number;
  y: number;
}

export type RoofStyleType = "flat" | "gable" | "hip" | "shed" | "mansard";

export interface RoofStyle {
  id: RoofStyleType;
  name: string;
  icon: string;
}

export interface CenterLineData {
  start: Point;
  end: Point;
  // For tracking connections to other roofs
  connectedToRoofId?: string;
  connectionType?: "endpoint" | "perpendicular";
}

export interface RoofData {
  id: string;
  style: RoofStyleType;
  points: Point[];
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  centerLine: CenterLineData;
  mergedWith?: string[]; // IDs of roofs this is merged with
  color: string;
}

export type DrawingMode =
  | "select"
  | "draw"
  | "pan"
  | "dragging"
  | "drawChimney"
  | "drawTree";

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface MapState {
  center: GeoPosition;
  zoom: number; // Google Maps zoom level (1-21)
  metersPerPixel: number; // real-world scale at current zoom & lat
}

export interface RoofObjectData {
  roofId: string;
  type: "roof" | "centerline";
}

// Chimney (roof obstacle) types
export type ChimneyShape = "circular" | "rectangular";

export interface ChimneyData {
  id: string;
  roofId: string; // The roof this chimney belongs to
  shape: ChimneyShape;
  // Position relative to the roof's center (local coordinates)
  localX: number;
  localY: number;
  // Dimensions
  width: number; // For rectangular, or diameter for circular
  height: number; // For rectangular only (circular uses width as diameter)
  // Appearance
  color: string;
}

// Tree (obstacle) types
export interface TreeData {
  id: string;
  // World position (Three.js coordinates)
  worldX: number;
  worldZ: number;
  // Dimensions
  radius: number; // canopy radius in world units
  height: number; // tree height in world units
  // Appearance
  color: string;
}

// Selection state
export type SelectionType = "roof" | "centerline" | "chimney" | "tree" | null;

export interface SelectionState {
  type: SelectionType;
  roofId: string | null;
  chimneyId?: string | null;
}

export interface SnapTarget {
  rectId: string;
  handle: "start" | "end" | "midpoint";
  point: [number, number, number];
  t?: number; // for midpoint snaps: parameter 0-1 along the target rect's centerline
}

export interface RectangleGroupProps {
  rect: Rectangle3D;
  allRects: Rectangle3D[];
  isSelected: boolean;
  onRectPointerDown: (e: ThreeEvent<PointerEvent>, rectId: string) => void;
  onHandlePointerDown: (
    e: ThreeEvent<PointerEvent>,
    rectId: string,
    handle: "start" | "end",
  ) => void;
  onWidthHandlePointerDown: (
    e: ThreeEvent<PointerEvent>,
    rectId: string,
    side: "left" | "right",
  ) => void;
  onToggleCap: (rectId: string, end: "start" | "end") => void;
  onRotateHandlePointerDown: (
    e: ThreeEvent<PointerEvent>,
    rectId: string,
  ) => void;
  onBreakConnection: (rectId: string, end: "start" | "end") => void;
  controlsOnly?: boolean;
  controlsOnRoof?: boolean;
  showMergeHandles?: boolean;
}
