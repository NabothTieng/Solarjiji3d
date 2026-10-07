import { atom } from "jotai";

export interface SolarPanelInstance {
  position: [number, number, number];
  normal: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
}

export interface SolarPanelConfig {
  roofSideKey: string;
  panelWidth: number;
  panelHeight: number;
  panelCount: number;
  panelWattage?: number;
  layoutMode?: "generated" | "manual";
  manualPanels?: ManualPanel2D[];

  columnSpacing?: number;

  rotationAngle?: number;

  standHeight?: number;

  rowSpacing?: number;

  inclinationAngle?: number;
}

export interface ManualPanel2D {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;

  rotation?: number;
}

export interface SelectedRoofSide {
  groupId: string;
  rectId?: string;
  sideIndex: number;
  vertices: number[];
  indices: number[];
  normal: [number, number, number];
}

export const selectedRoofSideAtom = atom<SelectedRoofSide | null>(null);

export interface SelectedSolarPanel {
  roofSideKey: string;
  panelIndex: number;
}

export const selectedSolarPanelAtom = atom<SelectedSolarPanel | null>(null);

export const solarPanelConfigsAtom = atom<SolarPanelConfig[]>([]);

export const defaultPanelWidthAtom = atom<number>(0.35);

export const defaultPanelHeightAtom = atom<number>(0.55);

export const defaultRotationAngleAtom = atom<number>(0);

export const defaultStandHeightAtom = atom<number>(0);

export const defaultRowSpacingAtom = atom<number>(0.03);

export const defaultColumnSpacingAtom = atom<number>(0.03);

export const defaultInclinationAngleAtom = atom<number>(0);

export interface RenderedPanelEntry {
  panels: SolarPanelInstance[];
  panelWidth: number;
  panelHeight: number;
  panelWattage?: number;
}
export const renderedPanelsAtom = atom<Map<string, RenderedPanelEntry>>(
  new Map(),
);
export const panelReportOpenAtom = atom<boolean>(false);

export interface RoofPanelEditorData {
  roofSideKey: string;
  groupId: string;
  rectId?: string;
  sideIndex: number;
  vertices: number[];
  indices: number[];
  normal: [number, number, number];
}

export const roofPanelEditorAtom = atom<RoofPanelEditorData | null>(null);

export interface Obstacle2D {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfDepth: number;
}


// Geometry helpers live in ./solarPanelGeometry; re-exported here so existing
// imports from "./solarPanelStore" continue to resolve.
export {
  PANEL_HALF_THICKNESS,
  isPointInTriangle2D,
  computeRoofSideFrame,
  chimneysToObstacles,
  neighborRoofObstacles,
  neighborRoofObstaclePolygons,
  generatePanelsForRoofSide,
  manualPanelsToInstances,
} from "./solarPanelGeometry";
