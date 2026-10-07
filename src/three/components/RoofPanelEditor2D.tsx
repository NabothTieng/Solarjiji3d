import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import * as THREE from "three";
import {
  roofPanelEditorAtom,
  solarPanelConfigsAtom,
  defaultPanelWidthAtom,
  defaultPanelHeightAtom,
  defaultRotationAngleAtom,
  defaultStandHeightAtom,
  defaultRowSpacingAtom,
  defaultColumnSpacingAtom,
  defaultInclinationAngleAtom,
  computeRoofSideFrame,
  generatePanelsForRoofSide,
  chimneysToObstacles,
  neighborRoofObstaclePolygons,
  type ManualPanel2D,
} from "../store/solarPanelStore";
import { rectanglesAtom, chimneysAtom } from "../store/rectangleStore";
import { metersPerUnitAtom } from "../../store/atoms";
import {
  nextPanelId,
  projectTo2D,
  pointInPolygonRayCast,
  isPanelInsideRoof,
  wouldOverlapAny,
  overlapsAnyObstacle,
  clipPolygonAgainstConvexPolygon,
  buildOrderedOutline,
  clampPanelToRoof,
} from "./roofPanelEditor/geometry";
import {
  overlayStyle,
  popupStyle,
  headerStyle,
  bodyStyle,
  canvasAreaStyle,
  sidebarStyle,
  sectionTitleStyle,
  labelRowStyle,
  inputStyle,
  buttonStyle,
} from "./roofPanelEditor/styles";
import {
  ResizeHandle,
  type ResizeDir,
  type EditorMode,
} from "./roofPanelEditor/ResizeHandle";
import { useSolarPlannerConfig } from "../../context/SolarPlannerConfigContext";
import { PanelControls } from "./moduleCatalog/PanelControls";
import { usePvModuleSelection } from "./moduleCatalog/usePvModuleSelection";

export function RoofPanelEditor2D() {
  const [editorData, setEditorData] = useAtom(roofPanelEditorAtom);

  if (!editorData) return null;

  return (
    <RoofPanelEditorInner
      editorData={editorData}
      onClose={() => setEditorData(null)}
    />
  );
}

import type { RoofPanelEditorData } from "../store/solarPanelStore";

const ROOF_PANEL_EDITOR_METERS_SCALE = 1;

function RoofPanelEditorInner({
  editorData,
  onClose,
}: {
  editorData: RoofPanelEditorData;
  onClose: () => void;
}) {
  const [panelConfigs, setPanelConfigs] = useAtom(solarPanelConfigsAtom);
  const defaultPanelWidth = useAtomValue(defaultPanelWidthAtom);
  const defaultPanelHeight = useAtomValue(defaultPanelHeightAtom);
  const [rotationAngle, setRotationAngle] = useAtom(defaultRotationAngleAtom);
  const [standHeight, setStandHeight] = useAtom(defaultStandHeightAtom);
  const [rowSpacing, setRowSpacing] = useAtom(defaultRowSpacingAtom);
  const [columnSpacing, setColumnSpacing] = useAtom(defaultColumnSpacingAtom);
  const [inclinationAngle, setInclinationAngle] = useAtom(
    defaultInclinationAngleAtom,
  );
  const metersPerUnit = useAtomValue(metersPerUnitAtom);
  const editorMetersPerUnit = metersPerUnit * ROOF_PANEL_EDITOR_METERS_SCALE;
  const { panelWattage: defaultPanelWattage } = useSolarPlannerConfig();
  const pvModuleSelection = usePvModuleSelection(true);
  const { selectedPvModule, selectedPvModuleDimensions } = pvModuleSelection;
  const catalogPanelWattage = selectedPvModule?.specs.at_stc?.pmax_w;
  const selectedPanelWattage =
    typeof catalogPanelWattage === "number" && catalogPanelWattage > 0
      ? catalogPanelWattage
      : defaultPanelWattage;
  const effectivePanelWidth =
    selectedPvModuleDimensions?.widthMeters !== undefined
      ? selectedPvModuleDimensions.widthMeters / editorMetersPerUnit
      : defaultPanelWidth;
  const effectivePanelHeight =
    selectedPvModuleDimensions?.heightMeters !== undefined
      ? selectedPvModuleDimensions.heightMeters / editorMetersPerUnit
      : defaultPanelHeight;

  const [autoGenerate, setAutoGenerate] = useState(true);
  const skipNextAutoGenerateRef = useRef(true);

  const isFlatSurface =
    editorData.groupId.startsWith("lot:") ||
    Math.abs(editorData.normal[1]) > 0.9;

  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [polygonDraftPoints, setPolygonDraftPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [polygonHoverPoint, setPolygonHoverPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const drawMode = editorMode === "draw";
  const polygonMode = editorMode === "polygon";

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    panelId: string;
    startMouseX: number;
    startMouseY: number;
    startPanelX: number;
    startPanelY: number;
  } | null>(null);
  const resizeRef = useRef<{
    panelId: string;
    dir: ResizeDir;
    startMouseX: number;
    startMouseY: number;
    startPanel: ManualPanel2D;
  } | null>(null);

  const { roofSideKey, vertices, indices, normal, groupId } = editorData;

  const rectangles = useAtomValue(rectanglesAtom);
  const chimneys = useAtomValue(chimneysAtom);

  const groupRects = useMemo(() => {
    const ids = groupId.split("+");
    const found: typeof rectangles = [];
    for (const id of ids) {
      const r = rectangles.find((rr) => rr.id === id);
      if (r) found.push(r);
    }
    return found;
  }, [rectangles, groupId]);

  const chimneyObstacles = useMemo(() => {
    if (groupRects.length === 0) return [];
    return groupRects.flatMap((r) =>
      chimneysToObstacles(chimneys, r, vertices, normal),
    );
  }, [chimneys, groupRects, vertices, normal]);

  const neighborObstaclePolygonsRaw = useMemo(() => {
    if (groupRects.length < 2 || !editorData.rectId) return [];
    return neighborRoofObstaclePolygons(
      groupRects,
      vertices,
      normal,
      editorData.rectId,
      indices,
    );
  }, [groupRects, vertices, normal, editorData.rectId, indices]);

  const obstacles = chimneyObstacles;

  const existingConfig = panelConfigs.find(
    (c) => c.roofSideKey === roofSideKey,
  );
  const [hasManualLayout, setHasManualLayout] = useState(
    () => existingConfig?.layoutMode === "manual",
  );

  const verts2D = useMemo(
    () => projectTo2D(vertices, normal),
    [vertices, normal],
  );

  const bbox = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    for (const v of verts2D) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    return { minX, maxX, minY, maxY };
  }, [verts2D]);

  const outlineVertices = useMemo(
    () => buildOrderedOutline(verts2D, indices),
    [verts2D, indices],
  );

  const outlinePath = useMemo(() => {
    if (outlineVertices.length === 0) return "";
    return (
      outlineVertices
        .map((v, idx) => {
          return `${idx === 0 ? "M" : "L"} ${v.x} ${v.y}`;
        })
        .join(" ") + " Z"
    );
  }, [outlineVertices]);

  const clippedNeighborObstaclePolygons = useMemo(() => {
    if (outlineVertices.length < 3) return [];
    return neighborObstaclePolygonsRaw
      .map((poly) => clipPolygonAgainstConvexPolygon(poly, outlineVertices))
      .filter((poly) => poly.length >= 3);
  }, [neighborObstaclePolygonsRaw, outlineVertices]);

  const padding = 0.15;
  const worldW = bbox.maxX - bbox.minX + padding * 2;
  const worldH = bbox.maxY - bbox.minY + padding * 2;
  const viewBox = `${bbox.minX - padding} ${bbox.minY - padding} ${worldW} ${worldH}`;

  const manualPanels: ManualPanel2D[] = useMemo(() => {
    if (
      existingConfig?.layoutMode === "manual" &&
      existingConfig.manualPanels
    ) {
      return existingConfig.manualPanels;
    }

    if (existingConfig) {
      const cfgRotation = isFlatSurface
        ? (existingConfig.rotationAngle ?? 0)
        : 0;
      const cfgStand = isFlatSurface ? (existingConfig.standHeight ?? 0) : 0;
      const cfgRowSpacing = existingConfig.rowSpacing;
      const cfgColumnSpacing = existingConfig.columnSpacing ?? 0.03;
      const cfgInclination = isFlatSurface
        ? (existingConfig.inclinationAngle ?? 0)
        : 0;
      const generated = generatePanelsForRoofSide(
        vertices,
        indices,
        normal,
        existingConfig.panelWidth,
        existingConfig.panelHeight,
        cfgColumnSpacing,
        obstacles,
        cfgRotation,
        cfgRowSpacing,
        cfgStand,
        cfgInclination,
        clippedNeighborObstaclePolygons,
      );

      const frame = computeRoofSideFrame(vertices, normal);
      return generated.map((p) => {
        const pos = new THREE.Vector3(...p.position);
        const rel = pos.clone().sub(frame.centroid);
        return {
          id: nextPanelId(),
          x: rel.dot(frame.right),
          y: rel.dot(frame.forward),
          width: existingConfig.panelWidth,
          height: existingConfig.panelHeight,
          rotation: cfgRotation,
        };
      });
    }
    return [];
  }, [
    existingConfig,
    vertices,
    indices,
    normal,
    obstacles,
    isFlatSurface,
    clippedNeighborObstaclePolygons,
  ]);

  const [localPanels, setLocalPanels] = useState<ManualPanel2D[]>(manualPanels);

  const prevKeyRef = useRef(roofSideKey);
  useEffect(() => {
    if (prevKeyRef.current !== roofSideKey) {
      prevKeyRef.current = roofSideKey;
      setLocalPanels(manualPanels);
      setHasManualLayout(existingConfig?.layoutMode === "manual");
      setSelectedPanelId(null);
    }
  }, [roofSideKey, manualPanels, existingConfig?.layoutMode]);

  useEffect(() => {
    if (localPanels.length === 0 && manualPanels.length > 0) {
      setLocalPanels(manualPanels);
    }
  }, []);

  const svgToWorld = useCallback(
    (
      e: React.PointerEvent | React.MouseEvent,
    ): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgPt = pt.matrixTransform(ctm.inverse());

      return { x: svgPt.x, y: bbox.minY + bbox.maxY - svgPt.y };
    },
    [bbox],
  );

  const worldToSvg = useCallback(
    (wx: number, wy: number) => ({ x: wx, y: wy }),
    [],
  );

  const svgScale = useMemo(() => {
    return 500 / worldW;
  }, [worldW]);

  const handleGenerate = useCallback(() => {
    const effectiveRotation = isFlatSurface ? rotationAngle : 0;
    const effectiveStand = isFlatSurface ? standHeight : 0;
    const effectiveRowSpacing = rowSpacing;
    const effectiveColumnSpacing = columnSpacing;
    const effectiveInclination = isFlatSurface ? inclinationAngle : 0;
    const generated = generatePanelsForRoofSide(
      vertices,
      indices,
      normal,
      effectivePanelWidth,
      effectivePanelHeight,
      effectiveColumnSpacing,
      obstacles,
      effectiveRotation,
      effectiveRowSpacing,
      effectiveStand,
      effectiveInclination,
      clippedNeighborObstaclePolygons,
    );
    const frame = computeRoofSideFrame(vertices, normal);
    const newPanels: ManualPanel2D[] = generated.map((p) => {
      const pos = new THREE.Vector3(...p.position);
      const rel = pos.clone().sub(frame.centroid);
      return {
        id: nextPanelId(),
        x: rel.dot(frame.right),
        y: rel.dot(frame.forward),
        width: effectivePanelWidth,
        height: effectivePanelHeight,
        rotation: effectiveRotation,
      };
    });
    setLocalPanels(newPanels);
    setHasManualLayout(false);
    setSelectedPanelId(null);
  }, [
    vertices,
    indices,
    normal,
    effectivePanelWidth,
    effectivePanelHeight,
    obstacles,
    isFlatSurface,
    rotationAngle,
    columnSpacing,
    rowSpacing,
    standHeight,
    inclinationAngle,
    clippedNeighborObstaclePolygons,
  ]);

  useEffect(() => {
    if (!autoGenerate || drawMode || polygonMode) return;
    if (skipNextAutoGenerateRef.current) {
      skipNextAutoGenerateRef.current = false;
      return;
    }
    handleGenerate();
  }, [autoGenerate, drawMode, polygonMode, handleGenerate]);

  const setEditorModeAndSync = useCallback((next: EditorMode) => {
    setEditorMode(next);
    if (next !== "select") setAutoGenerate(false);
    if (next !== "polygon") {
      setPolygonDraftPoints([]);
      setPolygonHoverPoint(null);
    }
  }, []);

  const finalizePolygonDraw = useCallback(() => {
    if (!isFlatSurface || polygonDraftPoints.length < 3) return;

    const angle = rotationAngle;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const axisU = { x: cosA, y: sinA };
    const axisV = { x: -sinA, y: cosA };

    const centroid = polygonDraftPoints.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 },
    );
    centroid.x /= polygonDraftPoints.length;
    centroid.y /= polygonDraftPoints.length;

    const polyUV = polygonDraftPoints.map((p) => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      return {
        u: dx * axisU.x + dy * axisU.y,
        v: dx * axisV.x + dy * axisV.y,
      };
    });

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of polyUV) {
      minU = Math.min(minU, p.u);
      maxU = Math.max(maxU, p.u);
      minV = Math.min(minV, p.v);
      maxV = Math.max(maxV, p.v);
    }

    const stepU = Math.max(0.01, effectivePanelWidth + columnSpacing);
    const stepV = Math.max(0.01, effectivePanelHeight + rowSpacing);
    const halfW = effectivePanelWidth / 2;
    const halfH = effectivePanelHeight / 2;
    const eps = 1e-9;

    const panelCorners = (cx: number, cy: number) => [
      {
        x: cx - halfW * cosA + halfH * sinA,
        y: cy - halfW * sinA - halfH * cosA,
      },
      {
        x: cx + halfW * cosA + halfH * sinA,
        y: cy + halfW * sinA - halfH * cosA,
      },
      {
        x: cx + halfW * cosA - halfH * sinA,
        y: cy + halfW * sinA + halfH * cosA,
      },
      {
        x: cx - halfW * cosA - halfH * sinA,
        y: cy - halfW * sinA + halfH * cosA,
      },
    ];

    const allCornersInside = (
      cx: number,
      cy: number,
      poly: { x: number; y: number }[],
    ) => {
      const corners = panelCorners(cx, cy);
      return corners.every((c) => pointInPolygonRayCast(c.x, c.y, poly));
    };

    const newPanels: ManualPanel2D[] = [];
    for (let v = minV + halfH + eps; v <= maxV - halfH - eps; v += stepV) {
      for (let u = minU + halfW + eps; u <= maxU - halfW - eps; u += stepU) {
        const cx = centroid.x + u * axisU.x + v * axisV.x;
        const cy = centroid.y + u * axisU.y + v * axisV.y;

        if (!allCornersInside(cx, cy, polygonDraftPoints)) continue;
        if (!allCornersInside(cx, cy, outlineVertices)) continue;
        if (
          overlapsAnyObstacle(
            cx,
            cy,
            effectivePanelWidth,
            effectivePanelHeight,
            obstacles,
            clippedNeighborObstaclePolygons,
          )
        )
          continue;
        if (
          wouldOverlapAny(
            cx,
            cy,
            effectivePanelWidth,
            effectivePanelHeight,
            localPanels,
          )
        )
          continue;
        if (
          wouldOverlapAny(
            cx,
            cy,
            effectivePanelWidth,
            effectivePanelHeight,
            newPanels,
          )
        )
          continue;

        newPanels.push({
          id: nextPanelId(),
          x: cx,
          y: cy,
          width: effectivePanelWidth,
          height: effectivePanelHeight,
          rotation: angle,
        });
      }
    }

    if (newPanels.length > 0) {
      setLocalPanels((prev) => [...prev, ...newPanels]);
      setHasManualLayout(true);
      setSelectedPanelId(newPanels[newPanels.length - 1].id);
    }

    setPolygonDraftPoints([]);
    setPolygonHoverPoint(null);
  }, [
    isFlatSurface,
    polygonDraftPoints,
    rotationAngle,
    effectivePanelWidth,
    effectivePanelHeight,
    columnSpacing,
    rowSpacing,
    outlineVertices,
    obstacles,
    clippedNeighborObstaclePolygons,
    localPanels,
  ]);

  const handleClear = useCallback(() => {
    setLocalPanels([]);
    setHasManualLayout(false);
    setSelectedPanelId(null);
    setPolygonDraftPoints([]);
    setPolygonHoverPoint(null);
  }, []);

  const handleApply = useCallback(() => {
    setPanelConfigs((prev) => {
      const filtered = prev.filter((c) => c.roofSideKey !== roofSideKey);
      if (localPanels.length === 0) return filtered;

      const pw = localPanels[0]?.width ?? effectivePanelWidth;
      const ph = localPanels[0]?.height ?? effectivePanelHeight;
      return [
        ...filtered,
        {
          roofSideKey,
          panelWidth: pw,
          panelHeight: ph,
          panelCount: localPanels.length,
          panelWattage: selectedPanelWattage,
          layoutMode: hasManualLayout ? "manual" : "generated",
          ...(hasManualLayout ? { manualPanels: localPanels } : {}),
          columnSpacing,
          rotationAngle: isFlatSurface ? rotationAngle : 0,
          standHeight: isFlatSurface ? standHeight : 0,
          rowSpacing,
          inclinationAngle: isFlatSurface ? inclinationAngle : 0,
        },
      ];
    });
    onClose();
  }, [
    localPanels,
    roofSideKey,
    effectivePanelWidth,
    effectivePanelHeight,
    selectedPanelWattage,
    setPanelConfigs,
    onClose,
    isFlatSurface,
    rotationAngle,
    columnSpacing,
    standHeight,
    rowSpacing,
    inclinationAngle,
    hasManualLayout,
  ]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drawMode && !polygonMode) {
        setSelectedPanelId(null);
        return;
      }
      const world = svgToWorld(e as unknown as React.PointerEvent);
      if (!world) return;

      if (polygonMode) {
        if (!isFlatSurface) return;
        if (!pointInPolygonRayCast(world.x, world.y, outlineVertices)) return;

        if (polygonDraftPoints.length >= 3) {
          const first = polygonDraftPoints[0];
          const closeDistance = Math.max(worldW, worldH) * 0.02;
          if (
            Math.hypot(world.x - first.x, world.y - first.y) <= closeDistance
          ) {
            finalizePolygonDraw();
            return;
          }
        }

        setPolygonDraftPoints((prev) => [...prev, world]);
        return;
      }

      if (!pointInPolygonRayCast(world.x, world.y, outlineVertices)) return;

      const clamped = clampPanelToRoof(
        world.x,
        world.y,
        effectivePanelWidth,
        effectivePanelHeight,
        outlineVertices,
        bbox,
        obstacles,
        clippedNeighborObstaclePolygons,
      );
      if (!clamped) return;

      if (
        overlapsAnyObstacle(
          clamped.x,
          clamped.y,
          effectivePanelWidth,
          effectivePanelHeight,
          obstacles,
          clippedNeighborObstaclePolygons,
        )
      )
        return;

      if (
        wouldOverlapAny(
          clamped.x,
          clamped.y,
          effectivePanelWidth,
          effectivePanelHeight,
          localPanels,
        )
      )
        return;

      const newPanel: ManualPanel2D = {
        id: nextPanelId(),
        x: clamped.x,
        y: clamped.y,
        width: effectivePanelWidth,
        height: effectivePanelHeight,
        rotation: isFlatSurface ? rotationAngle : 0,
      };
      setLocalPanels((prev) => [...prev, newPanel]);
      setHasManualLayout(true);
      setSelectedPanelId(newPanel.id);
    },
    [
      drawMode,
      svgToWorld,
      effectivePanelWidth,
      effectivePanelHeight,
      outlineVertices,
      bbox,
      localPanels,
      isFlatSurface,
      polygonMode,
      rotationAngle,
      obstacles,
      clippedNeighborObstaclePolygons,
      polygonDraftPoints,
      finalizePolygonDraw,
      worldW,
      worldH,
    ],
  );

  const handlePanelPointerDown = useCallback(
    (panelId: string, e: React.PointerEvent) => {
      if (drawMode) return;
      e.stopPropagation();
      setSelectedPanelId(panelId);
      const panel = localPanels.find((p) => p.id === panelId);
      if (!panel) return;
      dragRef.current = {
        panelId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanelX: panel.x,
        startPanelY: panel.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [drawMode, localPanels],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragRef.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;

        const startPt = svg.createSVGPoint();
        startPt.x = dragRef.current.startMouseX;
        startPt.y = dragRef.current.startMouseY;
        const startWorld = startPt.matrixTransform(ctm.inverse());

        const curPt = svg.createSVGPoint();
        curPt.x = e.clientX;
        curPt.y = e.clientY;
        const curWorld = curPt.matrixTransform(ctm.inverse());

        const dx = curWorld.x - startWorld.x;

        const dy = -(curWorld.y - startWorld.y);

        const newX = dragRef.current.startPanelX + dx;
        const newY = dragRef.current.startPanelY + dy;

        const panel = localPanels.find(
          (p) => p.id === dragRef.current!.panelId,
        );
        if (!panel) return;

        const clamped = clampPanelToRoof(
          newX,
          newY,
          panel.width,
          panel.height,
          outlineVertices,
          bbox,
          obstacles,
          clippedNeighborObstaclePolygons,
        );
        if (!clamped) return;

        if (
          overlapsAnyObstacle(
            clamped.x,
            clamped.y,
            panel.width,
            panel.height,
            obstacles,
            clippedNeighborObstaclePolygons,
          )
        )
          return;

        if (
          wouldOverlapAny(
            clamped.x,
            clamped.y,
            panel.width,
            panel.height,
            localPanels,
            panel.id,
          )
        )
          return;

        setLocalPanels((prev) =>
          prev.map((p) =>
            p.id === dragRef.current!.panelId
              ? { ...p, x: clamped.x, y: clamped.y }
              : p,
          ),
        );
        setHasManualLayout(true);
      }

      if (resizeRef.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const ctm = svg.getScreenCTM();
        if (!ctm) return;

        const startPt = svg.createSVGPoint();
        startPt.x = resizeRef.current.startMouseX;
        startPt.y = resizeRef.current.startMouseY;
        const startWorld = startPt.matrixTransform(ctm.inverse());

        const curPt = svg.createSVGPoint();
        curPt.x = e.clientX;
        curPt.y = e.clientY;
        const curWorld = curPt.matrixTransform(ctm.inverse());

        const dx = curWorld.x - startWorld.x;

        const dy = -(curWorld.y - startWorld.y);

        const sp = resizeRef.current.startPanel;
        const dir = resizeRef.current.dir;
        const minDim = 0.05;

        let newW = sp.width;
        let newH = sp.height;
        let newX = sp.x;
        let newY = sp.y;

        if (dir.includes("e")) {
          newW = Math.max(minDim, sp.width + dx);
          newX = sp.x + dx / 2;
        }
        if (dir.includes("w")) {
          newW = Math.max(minDim, sp.width - dx);
          newX = sp.x + dx / 2;
        }

        if (dir.includes("s")) {
          newH = Math.max(minDim, sp.height + dy);
          newY = sp.y + dy / 2;
        }
        if (dir.includes("n")) {
          newH = Math.max(minDim, sp.height - dy);
          newY = sp.y + dy / 2;
        }

        if (
          isPanelInsideRoof(newX, newY, newW, newH, outlineVertices) &&
          !overlapsAnyObstacle(
            newX,
            newY,
            newW,
            newH,
            obstacles,
            clippedNeighborObstaclePolygons,
          ) &&
          !wouldOverlapAny(
            newX,
            newY,
            newW,
            newH,
            localPanels,
            resizeRef.current.panelId,
          )
        ) {
          setLocalPanels((prev) =>
            prev.map((p) =>
              p.id === resizeRef.current!.panelId
                ? { ...p, x: newX, y: newY, width: newW, height: newH }
                : p,
            ),
          );
          setHasManualLayout(true);
        }
      }
    },
    [
      localPanels,
      outlineVertices,
      bbox,
      obstacles,
      clippedNeighborObstaclePolygons,
    ],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      handlePointerMove(e);
      if (!polygonMode) return;
      const world = svgToWorld(e);
      if (!world) return;
      setPolygonHoverPoint(world);
    },
    [handlePointerMove, polygonMode, svgToWorld],
  );

  const handleResizeStart = useCallback(
    (panelId: string, dir: ResizeDir, e: React.PointerEvent) => {
      e.stopPropagation();
      const panel = localPanels.find((p) => p.id === panelId);
      if (!panel) return;
      resizeRef.current = {
        panelId,
        dir,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanel: { ...panel },
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [localPanels],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedPanelId) return;
    setLocalPanels((prev) => prev.filter((p) => p.id !== selectedPanelId));
    setHasManualLayout(true);
    setSelectedPanelId(null);
  }, [selectedPanelId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPanelId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setEditorModeAndSync("draw");
        setSelectedPanelId(null);
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setEditorModeAndSync("select");
      }
      if (e.key === "p" || e.key === "P") {
        if (!isFlatSurface) return;
        e.preventDefault();
        setEditorModeAndSync("polygon");
        setSelectedPanelId(null);
      }
      if (e.key === "Enter") {
        if (!polygonMode || polygonDraftPoints.length < 3) return;
        e.preventDefault();
        finalizePolygonDraw();
      }
      if (e.key === "Escape" && polygonMode) {
        e.preventDefault();
        setPolygonDraftPoints([]);
        setPolygonHoverPoint(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedPanelId,
    handleDeleteSelected,
    setEditorModeAndSync,
    isFlatSurface,
    polygonMode,
    polygonDraftPoints.length,
    finalizePolygonDraw,
  ]);

  const selectedPanel = localPanels.find((p) => p.id === selectedPanelId);

  return (
    <div
      style={overlayStyle}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div style={popupStyle} onPointerDown={(e) => e.stopPropagation()}>
        {}
        <div style={headerStyle}>
          <span>Roof Panel Editor — Side {editorData.sideIndex}</span>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "#cdd6f4",
              fontSize: 18,
              cursor: "pointer",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={bodyStyle}>
          {/* Canvas area */}
          <div style={canvasAreaStyle}>
            <svg
              ref={svgRef}
              viewBox={viewBox}
              width="100%"
              height="100%"
              style={{
                display: "block",
                minHeight: 400,
                transform: "scaleY(-1)",
              }}
              onClick={handleCanvasClick}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Roof polygon fill */}
              <path
                d={outlinePath}
                fill="#2a2a3e"
                stroke="#6c7086"
                strokeWidth={0.01}
              />

              {}
              {(() => {
                const lines: React.ReactNode[] = [];
                const numTris = indices.length / 3;
                for (let t = 0; t < numTris; t++) {
                  const a = verts2D[indices[t * 3]];
                  const b = verts2D[indices[t * 3 + 1]];
                  const c = verts2D[indices[t * 3 + 2]];
                  lines.push(
                    <polygon
                      key={t}
                      points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
                      fill="none"
                      stroke="#45475a"
                      strokeWidth={0.003}
                    />,
                  );
                }
                return lines;
              })()}

              {}
              {chimneyObstacles.map((obs, idx) => (
                <rect
                  key={`chimney-${idx}`}
                  x={obs.centerX - obs.halfWidth}
                  y={obs.centerY - obs.halfDepth}
                  width={obs.halfWidth * 2}
                  height={obs.halfDepth * 2}
                  fill="rgba(139, 69, 19, 0.6)"
                  stroke="#8b4513"
                  strokeWidth={0.006}
                  pointerEvents="none"
                />
              ))}

              {}
              <defs>
                <pattern
                  id="blocked-hatch"
                  patternUnits="userSpaceOnUse"
                  width={0.12}
                  height={0.12}
                  patternTransform="rotate(45)"
                >
                  <rect
                    width={0.12}
                    height={0.12}
                    fill="rgba(244, 67, 54, 0.45)"
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={0.12}
                    stroke="#f44336"
                    strokeWidth={0.03}
                  />
                </pattern>
                <clipPath id="roof-outline-clip" clipPathUnits="userSpaceOnUse">
                  <path d={outlinePath} clipRule="evenodd" />
                </clipPath>
              </defs>

              {}
              {clippedNeighborObstaclePolygons.map((poly, idx) => (
                <polygon
                  key={`blocked-outline-${idx}`}
                  points={poly.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#f44336"
                  strokeWidth={0.02}
                  strokeDasharray="0.05 0.04"
                  pointerEvents="none"
                />
              ))}
              <g clipPath="url(#roof-outline-clip)" pointerEvents="none">
                {clippedNeighborObstaclePolygons.map((poly, idx) => (
                  <polygon
                    key={`blocked-fill-${idx}`}
                    points={poly.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="url(#blocked-hatch)"
                  />
                ))}
              </g>

              {/* Panels */}
              {localPanels.map((panel) => {
                const isSelected = panel.id === selectedPanelId;
                // The 2D editor is a top-down view, so when the panel is

                const cosT =
                  isFlatSurface && autoGenerate
                    ? Math.cos(inclinationAngle)
                    : 1;
                const visW = panel.width;
                const visH = panel.height * cosT;
                const hw = visW / 2;
                const hh = visH / 2;

                const rotDeg = ((panel.rotation ?? 0) * 180) / Math.PI;
                return (
                  <g
                    key={panel.id}
                    transform={`rotate(${rotDeg} ${panel.x} ${panel.y})`}
                  >
                    <rect
                      x={panel.x - hw}
                      y={panel.y - hh}
                      width={visW}
                      height={visH}
                      fill={
                        isSelected
                          ? "rgba(21, 101, 192, 0.7)"
                          : "rgba(21, 101, 192, 0.5)"
                      }
                      stroke={isSelected ? "#ffa500" : "#64b5f6"}
                      strokeWidth={isSelected ? 0.008 : 0.005}
                      style={{ cursor: drawMode ? "crosshair" : "move" }}
                      onPointerDown={(e) => handlePanelPointerDown(panel.id, e)}
                    />
                    {}
                    <line
                      x1={panel.x}
                      y1={panel.y - hh}
                      x2={panel.x}
                      y2={panel.y + hh}
                      stroke="#64b5f6"
                      strokeWidth={0.002}
                      opacity={0.4}
                      pointerEvents="none"
                    />
                    <line
                      x1={panel.x - hw}
                      y1={panel.y}
                      x2={panel.x + hw}
                      y2={panel.y}
                      stroke="#64b5f6"
                      strokeWidth={0.002}
                      opacity={0.4}
                      pointerEvents="none"
                    />

                    {}
                    {isSelected && !drawMode && (
                      <>
                        {(
                          [
                            "n",
                            "s",
                            "e",
                            "w",
                            "ne",
                            "nw",
                            "se",
                            "sw",
                          ] as ResizeDir[]
                        ).map((dir) => (
                          <ResizeHandle
                            key={dir}
                            panel={panel}
                            dir={dir}
                            scale={svgScale}
                            worldToSvg={worldToSvg}
                            onResizeStart={handleResizeStart}
                          />
                        ))}
                      </>
                    )}
                  </g>
                );
              })}

              {}
              {polygonMode &&
                isFlatSurface &&
                polygonDraftPoints.length > 0 && (
                  <>
                    <polyline
                      points={polygonDraftPoints
                        .map((p) => `${p.x},${p.y}`)
                        .join(" ")}
                      fill="none"
                      stroke="#ffd166"
                      strokeWidth={0.01}
                      strokeDasharray="0.03 0.02"
                      pointerEvents="none"
                    />
                    {polygonHoverPoint && (
                      <line
                        x1={polygonDraftPoints[polygonDraftPoints.length - 1].x}
                        y1={polygonDraftPoints[polygonDraftPoints.length - 1].y}
                        x2={polygonHoverPoint.x}
                        y2={polygonHoverPoint.y}
                        stroke="#ffd166"
                        strokeWidth={0.008}
                        pointerEvents="none"
                      />
                    )}
                    {polygonDraftPoints.length >= 3 && (
                      <line
                        x1={polygonDraftPoints[polygonDraftPoints.length - 1].x}
                        y1={polygonDraftPoints[polygonDraftPoints.length - 1].y}
                        x2={polygonDraftPoints[0].x}
                        y2={polygonDraftPoints[0].y}
                        stroke="#ffd166"
                        strokeWidth={0.006}
                        strokeDasharray="0.02 0.02"
                        pointerEvents="none"
                      />
                    )}
                    {polygonDraftPoints.map((p, idx) => (
                      <circle
                        key={`poly-point-${idx}`}
                        cx={p.x}
                        cy={p.y}
                        r={idx === 0 ? 0.018 : 0.012}
                        fill={idx === 0 ? "#ff9f1c" : "#ffd166"}
                        stroke="#1e1e2e"
                        strokeWidth={0.003}
                        pointerEvents="none"
                      />
                    ))}
                  </>
                )}
            </svg>

            {}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: drawMode
                  ? "rgba(76, 175, 80, 0.9)"
                  : "rgba(137, 180, 250, 0.9)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 4,
                pointerEvents: "none",
              }}
            >
              {drawMode && "DRAW MODE — Click to place panels"}
              {polygonMode &&
                "POLYGON MODE — Click points, close on first point or press Enter"}
              {!drawMode &&
                !polygonMode &&
                "SELECT MODE — Click panels to select, drag to move"}
            </div>

            {/* Panel count */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                background: "rgba(30, 30, 46, 0.9)",
                color: "#a6e3a1",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 4,
                pointerEvents: "none",
              }}
            >
              {localPanels.length} panel{localPanels.length !== 1 ? "s" : ""}
            </div>

            {}
            {clippedNeighborObstaclePolygons.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  background: "rgba(30, 30, 46, 0.9)",
                  color: "#f44336",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 4,
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    background:
                      "repeating-linear-gradient(45deg, rgba(244,67,54,0.28) 0 3px, #f44336 3px 4px)",
                    border: "1px solid #f44336",
                  }}
                />
                Blocked area (covered by other roof)
              </div>
            )}
          </div>

          {}
          <div style={sidebarStyle}>
            {}
            <div>
              <div style={sectionTitleStyle}>Mode</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <button
                  onClick={() => setEditorModeAndSync("select")}
                  style={{
                    ...buttonStyle,
                    background: editorMode === "select" ? "#89b4fa" : "#313244",
                    color: editorMode === "select" ? "#1e1e2e" : "#cdd6f4",
                    flex: 1,
                  }}
                >
                  Select
                </button>
                <button
                  onClick={() => {
                    setEditorModeAndSync("draw");
                    setSelectedPanelId(null);
                  }}
                  style={{
                    ...buttonStyle,
                    background: drawMode ? "#4caf50" : "#313244",
                    color: drawMode ? "#fff" : "#cdd6f4",
                    flex: 1,
                  }}
                >
                  Draw
                </button>
              </div>
            </div>

            <PanelControls
              selection={pvModuleSelection}
              idPrefix="roof-panel-editor"
              sectionTitleStyle={sectionTitleStyle}
              isFlatSurface={isFlatSurface}
              metersPerUnit={editorMetersPerUnit}
              rotationAngle={rotationAngle}
              setRotationAngle={setRotationAngle}
              standHeight={standHeight}
              setStandHeight={setStandHeight}
              rowSpacing={rowSpacing}
              setRowSpacing={setRowSpacing}
              columnSpacing={columnSpacing}
              setColumnSpacing={setColumnSpacing}
              inclinationAngle={inclinationAngle}
              setInclinationAngle={setInclinationAngle}
              showLayoutControls
              rangeLimits={{
                spacingMax: 4,
                standHeightMax: 6,
                inclinationMinDeg: 0,
                inclinationMaxDeg: 45,
              }}
              livePreview={{
                title: "Auto Generate",
                label: "Live preview",
                checked: autoGenerate,
                disabled: drawMode || polygonMode,
                onChange: setAutoGenerate,
              }}
              actions={{
                generateLabel: "Generate Panels",
                clearLabel: "Clear All",
                showClear: true,
                onGenerate: handleGenerate,
                onClear: handleClear,
              }}
            />

            {}
            {selectedPanel && !drawMode && !polygonMode && (
              <div>
                <div style={sectionTitleStyle}>Selected Panel</div>
                <div
                  style={{
                    background: "#313244",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={labelRowStyle}>
                    <span style={{ color: "#a6adc8" }}>Width</span>
                    <input
                      type="number"
                      value={parseFloat(selectedPanel.width.toFixed(3))}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0.01) {
                          setLocalPanels((prev) =>
                            prev.map((p) =>
                              p.id === selectedPanelId ? { ...p, width: v } : p,
                            ),
                          );
                          setHasManualLayout(true);
                        }
                      }}
                      style={inputStyle}
                      step={0.01}
                      min={0.05}
                    />
                  </div>
                  <div style={labelRowStyle}>
                    <span style={{ color: "#a6adc8" }}>Height</span>
                    <input
                      type="number"
                      value={parseFloat(selectedPanel.height.toFixed(3))}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0.01) {
                          setLocalPanels((prev) =>
                            prev.map((p) =>
                              p.id === selectedPanelId
                                ? { ...p, height: v }
                                : p,
                            ),
                          );
                          setHasManualLayout(true);
                        }
                      }}
                      style={inputStyle}
                      step={0.01}
                      min={0.05}
                    />
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    style={{
                      ...buttonStyle,
                      background: "#f38ba8",
                      color: "#1e1e2e",
                      fontSize: 11,
                      padding: "6px 0",
                      marginTop: 4,
                    }}
                  >
                    Delete Panel
                  </button>
                </div>
              </div>
            )}

            {}
            <div style={{ flex: 1 }} />

            {}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleApply}
                style={{
                  ...buttonStyle,
                  background: "#a6e3a1",
                  color: "#1e1e2e",
                  fontSize: 13,
                  padding: "10px 0",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#94d990")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#a6e3a1")
                }
              >
                Apply ({localPanels.length} panels)
              </button>
              <button
                onClick={handleClose}
                style={{
                  ...buttonStyle,
                  background: "#45475a",
                  color: "#cdd6f4",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#585b70")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#45475a")
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
