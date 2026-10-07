import { useRef, useState, useCallback, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type ThreeEvent } from "@react-three/fiber";
import { DoubleSide, Vector3 } from "three";
import {
  rectanglesAtom,
  selectedRectangleIdAtom,
  interactionModeAtom,
  isDraggingHandleAtom,
  activeToolAtom,
  trees3DAtom,
  lastTreeDimensionsAtom,
  chimneysAtom,
  selectedChimneyIdAtom,
  getChimneyLocalPosition,
  type Rectangle3D,
  type MergeConnection,
  type EndCapType,
} from "../store/rectangleStore";
import { metersPerUnitAtom } from "../../store/atoms";
import { solarPanelConfigsAtom } from "../store/solarPanelStore";
import { lotsAtom, selectedLotIdAtom, type Lot3D } from "../store/lotStore";
import { DEFAULT_LOT_COLOR } from "./Lot3D";
import { generateId } from "../../utils/helpers";
import { MERGE_BREAK_THRESHOLD, Y_LINE } from "../constants";
import { findSnapTarget, getRectangleControlY } from "../helpers/modelCreation";
import type { SnapTarget } from "../../types";
import RectangleGroup from "./Rectangles/RectangleGroup";
import {
  type DragState,
  rayToGroundPoint,
  roofSideKeyIncludesRectId,
  getAlignedShedDirection,
} from "./interactiveScene/helpers";
import {
  DrawPreview,
  PolygonDraftPreview,
} from "./interactiveScene/previews";

interface InteractiveSceneProps {
  renderRectangles?: boolean;
  renderControls?: boolean;
  controlsOnRoof?: boolean;
}

export const InteractiveScene = ({
  renderRectangles = true,
  renderControls = renderRectangles,
  controlsOnRoof = false,
}: InteractiveSceneProps) => {
  const [rectangles, setRectangles] = useAtom(rectanglesAtom);
  const [selectedId, setSelectedId] = useAtom(selectedRectangleIdAtom);
  const mode = useAtomValue(interactionModeAtom);
  const setMode = useSetAtom(interactionModeAtom);
  const setActiveTool = useSetAtom(activeToolAtom);
  const setIsDraggingHandle = useSetAtom(isDraggingHandleAtom);
  const activeTool = useAtomValue(activeToolAtom);
  const setSolarPanelConfigs = useSetAtom(solarPanelConfigsAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const setChimneys = useSetAtom(chimneysAtom);
  const setSelectedChimneyId = useSetAtom(selectedChimneyIdAtom);
  const setLots = useSetAtom(lotsAtom);
  const setSelectedLotId = useSetAtom(selectedLotIdAtom);
  const lastTreeDimensions = useAtomValue(lastTreeDimensionsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);

  const modeRef = useRef(mode);
  const rectanglesRef = useRef(rectangles);
  const activeToolRef = useRef(activeTool);
  const lastTreeDimensionsRef = useRef(lastTreeDimensions);
  const metersPerUnitRef = useRef(metersPerUnit);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    rectanglesRef.current = rectangles;
  }, [rectangles]);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);
  useEffect(() => {
    lastTreeDimensionsRef.current = lastTreeDimensions;
  }, [lastTreeDimensions]);
  useEffect(() => {
    metersPerUnitRef.current = metersPerUnit;
  }, [metersPerUnit]);

  const drawStartRef = useRef<Vector3 | null>(null);
  const [preview, setPreview] = useState<{
    start: Vector3;
    end: Vector3;
  } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Vector3[]>([]);
  const [polygonHoverPoint, setPolygonHoverPoint] = useState<Vector3 | null>(null);
  const lastGroundPointRef = useRef<Vector3 | null>(null);
  const drawStartSnapRef = useRef<SnapTarget | null>(null);
  const drawEndSnapRef = useRef<SnapTarget | null>(null);
  const polygonFinalizingRef = useRef(false);

  const dragRef = useRef<DragState | null>(null);
  const snapTargetRef = useRef<SnapTarget | null>(null);
  const [snapIndicatorPos, setSnapIndicatorPos] = useState<
    [number, number, number] | null
  >(null);

  const getControlY = useCallback(
    (rect: Rectangle3D | undefined) => {
      if (!controlsOnRoof || !rect) return Y_LINE;
      return getRectangleControlY(rect);
    },
    [controlsOnRoof],
  );


  const clearSolarPanelsForRects = useCallback(
    (rectIds: Set<string>) => {
      setSolarPanelConfigs((prev) =>
        prev.filter((config) => !roofSideKeyIncludesRectId(config.roofSideKey, rectIds))
      );
    },
    [setSolarPanelConfigs]
  );

  const clearPolygonDraft = useCallback(() => {
    setPolygonPoints([]);
    setPolygonHoverPoint(null);
  }, []);

  const finalizePolygonDraft = useCallback(() => {
    const tool = activeToolRef.current;
    if (polygonFinalizingRef.current) return;
    if (polygonPoints.length < 3 || (tool !== "polygon" && tool !== "polygon-lot")) return;

    polygonFinalizingRef.current = true;

    const footprint = polygonPoints.map((p) => [p.x, 0, p.z] as [number, number, number]);
    const xs = footprint.map((p) => p[0]);
    const zs = footprint.map((p) => p[2]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const midZ = (minZ + maxZ) / 2;

    if (tool === "polygon-lot") {
      const newLot: Lot3D = {
        id: generateId(),
        corner1: [minX, 0, minZ],
        corner2: [maxX, 0, maxZ],
        polygonFootprint: footprint,
        color: DEFAULT_LOT_COLOR,
      };
      setLots((prev) => [...prev, newLot]);
      setSelectedLotId(newLot.id);
      setSelectedId(null);
    } else {
      const newRect: Rectangle3D = {
        id: generateId(),
        start: [minX, 0, midZ],
        end: [maxX, 0, midZ],
        depth: Math.max(maxZ - minZ, 0.2),
        polygonFootprint: footprint,
        color: "#ffffff",
        startCap: "flat",
        endCap: "flat",
        roofType: "flat",
        wallHeight: 0.8,
        pitchAngle: 0,
      };
      setRectangles((prev) => [...prev, newRect]);
      setSelectedId(newRect.id);
      setSelectedLotId(null);
    }

    clearPolygonDraft();
  }, [polygonPoints, setLots, setSelectedLotId, setSelectedId, setRectangles, clearPolygonDraft]);

  const finishStandardDraw = useCallback((endPoint: Vector3) => {
    const tool = activeToolRef.current;
    const start = drawStartRef.current;
    if (modeRef.current !== "draw" || !start) return false;

    const absDx = Math.abs(endPoint.x - start.x);
    const absDz = Math.abs(endPoint.z - start.z);
    if (absDx <= 0.1 && absDz <= 0.1) return false;

    if (tool === "lot") {
      const newLot: Lot3D = {
        id: generateId(),
        corner1: [start.x, 0, start.z],
        corner2: [endPoint.x, 0, endPoint.z],
        color: DEFAULT_LOT_COLOR,
      };
      setLots((prev) => [...prev, newLot]);
      setSelectedLotId(newLot.id);
      setMode("select");
      setActiveTool("select");
      drawStartRef.current = null;
      drawStartSnapRef.current = null;
      drawEndSnapRef.current = null;
      setSnapIndicatorPos(null);
      setPreview(null);
      return true;
    }

    const midX = (start.x + endPoint.x) / 2;
    const midZ = (start.z + endPoint.z) / 2;
    let s: [number, number, number];
    let en: [number, number, number];
    let depth: number;

    if (absDx >= absDz) {
      depth = Math.max(absDz, 0.2);
      s = [start.x, 0, midZ];
      en = [endPoint.x, 0, midZ];
    } else {
      depth = Math.max(absDx, 0.2);
      s = [midX, 0, start.z];
      en = [midX, 0, endPoint.z];
    }

    const roofType =
      tool === "hip" || tool === "flat" || tool === "shed"
        ? (tool as "hip" | "flat" | "shed")
        : "hip";

    const newRect: Rectangle3D = {
      id: generateId(),
      start: s,
      end: en,
      depth,
      color: "#ffffff",
      startCap: "flat",
      endCap: "flat",
      roofType,
      wallHeight: 0.8,
      pitchAngle: roofType === "flat" ? 0 : 0.5,
    };

    const startSnap = drawStartSnapRef.current;
    const endSnap = drawEndSnapRef.current;
    const finalRect = {
      ...newRect,
      ...(startSnap
        ? {
            mergeStart: {
              rectId: startSnap.rectId,
              handle: startSnap.handle,
              ...(startSnap.handle === "midpoint" ? { t: startSnap.t } : {}),
            },
          }
        : {}),
      ...(endSnap
        ? {
            mergeEnd: {
              rectId: endSnap.rectId,
              handle: endSnap.handle,
              ...(endSnap.handle === "midpoint" ? { t: endSnap.t } : {}),
            },
          }
        : {}),
    };

    setRectangles((prev) => {
      const next = [...prev, finalRect];
      return next.map((r) => {
        if (r.id === finalRect.id) return r;
        if (startSnap && startSnap.handle !== "midpoint" && r.id === startSnap.rectId) {
          return startSnap.handle === "start"
            ? { ...r, mergeStart: { rectId: finalRect.id, handle: "start" as const } }
            : { ...r, mergeEnd: { rectId: finalRect.id, handle: "start" as const } };
        }
        if (endSnap && endSnap.handle !== "midpoint" && r.id === endSnap.rectId) {
          return endSnap.handle === "start"
            ? { ...r, mergeStart: { rectId: finalRect.id, handle: "end" as const } }
            : { ...r, mergeEnd: { rectId: finalRect.id, handle: "end" as const } };
        }
        return r;
      });
    });
    setSelectedId(newRect.id);
    // A completed Draw operation is a single-shot action. Reset the draft and
    // return to Select so the next click cannot accidentally start another roof.
    setMode("select");
    setActiveTool("select");
    drawStartRef.current = null;
    drawStartSnapRef.current = null;
    drawEndSnapRef.current = null;
    lastGroundPointRef.current = null;
    setSnapIndicatorPos(null);
    setPreview(null);
    return true;
  }, [setLots, setSelectedLotId, setRectangles, setSelectedId, setMode, setActiveTool]);

  const onGroundContextMenu = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      // The actual Draw commit is handled by the R3F pointer-down event.
      // This handler only prevents the browser context menu.
      if (modeRef.current === "draw") {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tool = activeToolRef.current;
      if (modeRef.current !== "draw" || (tool !== "polygon" && tool !== "polygon-lot")) return;
      if (e.key === "Enter") {
        if (polygonPoints.length < 3) return;
        e.preventDefault();
        finalizePolygonDraft();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearPolygonDraft();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [polygonPoints.length, finalizePolygonDraft, clearPolygonDraft]);


  const getConnectedRectIds = useCallback(
    (startRectId: string, includeMidpoint = true): Set<string> => {
      const connectedIds = new Set<string>();
      const queue = [startRectId];
      const rectMap = new Map(rectangles.map((r) => [r.id, r]));
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (connectedIds.has(id)) continue;
        connectedIds.add(id);
        const rect = rectMap.get(id);
        if (!rect) continue;
        for (const merge of [rect.mergeStart, rect.mergeEnd]) {
          if (merge && !connectedIds.has(merge.rectId)) {
            if (includeMidpoint || merge.handle !== "midpoint") {
              queue.push(merge.rectId);
            }
          }
        }

        for (const other of rectangles) {
          if (connectedIds.has(other.id)) continue;
          if (
            (other.mergeStart?.rectId === id) ||
            (other.mergeEnd?.rectId === id)
          ) {
            if (includeMidpoint ||
                (other.mergeStart?.rectId !== id || other.mergeStart?.handle !== "midpoint") &&
                (other.mergeEnd?.rectId !== id || other.mergeEnd?.handle !== "midpoint")) {
              queue.push(other.id);
            }
          }
        }
      }
      return connectedIds;
    },
    [rectangles]
  );

  const onGroundPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const m = modeRef.current;
      const tool = activeToolRef.current;
      const point = rayToGroundPoint(e);
      lastGroundPointRef.current = point.clone();

      if (e.button === 2) {
        e.stopPropagation();

        if (m !== "draw") return;

        if (tool === "polygon" || tool === "polygon-lot") {
          if (polygonPoints.length >= 3) finalizePolygonDraft();
          else clearPolygonDraft();
          return;
        }

        if (drawStartRef.current) {
          const point = rayToGroundPoint(e);
          const end = drawEndSnapRef.current
            ? new Vector3(...drawEndSnapRef.current.point)
            : point;
          lastGroundPointRef.current = end.clone();
          finishStandardDraw(end);
        }
        return;
      }

      if (m === "draw" && (tool === "polygon" || tool === "polygon-lot")) {
        e.stopPropagation();
        if (polygonPoints.length >= 3) {
          const first = polygonPoints[0];
          if (Math.hypot(point.x - first.x, point.z - first.z) <= 0.35) {
            finalizePolygonDraft();
            return;
          }
        }
        setPolygonPoints((prev) => [...prev, point]);
        return;
      }


      if (m === "draw" && tool === "tree") {
        e.stopPropagation();
        const dims = lastTreeDimensionsRef.current;
        const mpu = metersPerUnitRef.current || 1;
        const radiusUnits = dims.canopyRadius / mpu;
        const heightUnits = dims.height / mpu;
        setTrees((prev) => [
          ...prev,
          {
            id: generateId(),
            position: [point.x, 0, point.z] as [number, number, number],
            radius: radiusUnits,
            height: heightUnits,
            color: "#2E7D32",
          },
        ]);
        return;
      }

      if (m === "draw") {
        e.stopPropagation();
        const roofType =
          tool === "flat" ? "flat" : tool === "shed" ? "shed" : "hip";
        const snap = findSnapTarget(point, "__new__", rectanglesRef.current);
        const usableSnap = snap
          ? (rectanglesRef.current.find((r) => r.id === snap.rectId)?.roofType ?? "hip") === roofType
            ? snap
            : null
          : null;
        const startPoint = usableSnap ? new Vector3(...usableSnap.point) : point;
        drawStartRef.current = startPoint;
        drawStartSnapRef.current = usableSnap;
        drawEndSnapRef.current = null;
        lastGroundPointRef.current = startPoint.clone();
        polygonFinalizingRef.current = false;
        setSnapIndicatorPos(usableSnap ? [...usableSnap.point] : null);
        setPreview(null);
      } else if (m === "select" && !dragRef.current) {
        setSelectedId(null);
        setSelectedLotId(null);
      }
    },
    [
      setSelectedId,
      setTrees,
      setSelectedLotId,
      polygonPoints,
      finalizePolygonDraft,
      clearPolygonDraft,
      finishStandardDraw,
    ],
  );

  const onGroundPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const m = modeRef.current;
      const point = rayToGroundPoint(e);
      lastGroundPointRef.current = point.clone();
      const tool = activeToolRef.current;

      if (m === "draw" && (tool === "polygon" || tool === "polygon-lot")) {
        setPolygonHoverPoint(point.clone());
        return;
      }

      if (m === "draw" && drawStartRef.current) {
        const toolRoofType =
          tool === "flat" ? "flat" : tool === "shed" ? "shed" : "hip";
        const snap = findSnapTarget(point, "__new__", rectanglesRef.current);
        const usableSnap = snap
          ? (rectanglesRef.current.find((r) => r.id === snap.rectId)?.roofType ?? "hip") === toolRoofType
            ? snap
            : null
          : null;
        const displayPoint = usableSnap ? new Vector3(...usableSnap.point) : point.clone();
        drawEndSnapRef.current = usableSnap;
        lastGroundPointRef.current = displayPoint.clone();
        setSnapIndicatorPos(usableSnap ? [...usableSnap.point] : null);
        setPreview({ start: drawStartRef.current, end: displayPoint });
      }

      const drag = dragRef.current;
      if (!drag) return;


      if (drag.type === "rect" && drag.offset) {
        setRectangles((prev) => {
          const dr = prev.find((r) => r.id === drag.rectId);
          if (!dr) return prev;

          const oldCX = (dr.start[0] + dr.end[0]) / 2;
          const oldCZ = (dr.start[2] + dr.end[2]) / 2;
          const dx = point.x - drag.offset!.x - oldCX;
          const dz = point.z - drag.offset!.z - oldCZ;


          const mergeUpdates = new Map<
            string,
            { h: "start" | "end"; pos: [number, number, number] }
          >();
          if (dr.mergeStart && dr.mergeStart.handle !== "midpoint") {
            mergeUpdates.set(dr.mergeStart.rectId, {
              h: dr.mergeStart.handle,
              pos: [dr.start[0] + dx, 0, dr.start[2] + dz],
            });
          }
          if (dr.mergeEnd && dr.mergeEnd.handle !== "midpoint") {
            mergeUpdates.set(dr.mergeEnd.rectId, {
              h: dr.mergeEnd.handle,
              pos: [dr.end[0] + dx, 0, dr.end[2] + dz],
            });
          }


          const fullMoves = new Set<string>();
          prev.forEach((r) => {
            if (r.id === drag.rectId) return;
            if (
              r.mergeStart?.handle === "midpoint" &&
              r.mergeStart.rectId === drag.rectId
            )
              fullMoves.add(r.id);
            if (
              r.mergeEnd?.handle === "midpoint" &&
              r.mergeEnd.rectId === drag.rectId
            )
              fullMoves.add(r.id);
          });

          return prev.map((r) => {
            if (r.id === drag.rectId) {
              return {
                ...r,
                polygonFootprint: r.polygonFootprint?.map((p) => [
                  p[0] + dx,
                  0,
                  p[2] + dz,
                ] as [number, number, number]),
                start: [r.start[0] + dx, 0, r.start[2] + dz] as [
                  number,
                  number,
                  number,
                ],
                end: [r.end[0] + dx, 0, r.end[2] + dz] as [
                  number,
                  number,
                  number,
                ],
              };
            }

            if (fullMoves.has(r.id)) {
              return {
                ...r,
                polygonFootprint: r.polygonFootprint?.map((p) => [
                  p[0] + dx,
                  0,
                  p[2] + dz,
                ] as [number, number, number]),
                start: [r.start[0] + dx, 0, r.start[2] + dz] as [
                  number,
                  number,
                  number,
                ],
                end: [r.end[0] + dx, 0, r.end[2] + dz] as [
                  number,
                  number,
                  number,
                ],
              };
            }
            const mu = mergeUpdates.get(r.id);
            if (mu) {
              return mu.h === "start"
                ? { ...r, start: mu.pos }
                : { ...r, end: mu.pos };
            }
            return r;
          });
        });
        return;
      }


      if (drag.type === "handle" && drag.handle) {
        let newPt: [number, number, number] = [point.x, 0, point.z];

        const draggedRect = rectanglesRef.current.find(
          (r) => r.id === drag.rectId,
        );
        const merge = draggedRect
          ? drag.handle === "start"
            ? draggedRect.mergeStart
            : draggedRect.mergeEnd
          : undefined;
        const isAlreadyMerged = !!merge;


        if (isAlreadyMerged && merge) {
          let shouldBreak = false;

          if (merge.handle === "midpoint") {

            const target = rectanglesRef.current.find(
              (r) => r.id === merge.rectId,
            );
            if (target) {
              const sx = target.start[0],
                sz = target.start[2];
              const ex = target.end[0],
                ez = target.end[2];
              const dx = ex - sx,
                dz = ez - sz;
              const len2 = dx * dx + dz * dz;
              if (len2 > 0.001) {

                let t = ((point.x - sx) * dx + (point.z - sz) * dz) / len2;
                t = Math.max(0, Math.min(1, t));
                const closestX = sx + t * dx;
                const closestZ = sz + t * dz;
                const distToCenterline = Math.sqrt(
                  (point.x - closestX) ** 2 + (point.z - closestZ) ** 2,
                );
                shouldBreak = distToCenterline > MERGE_BREAK_THRESHOLD;
              }
            }
          } else {

            const other = rectanglesRef.current.find(
              (r) => r.id === merge.rectId,
            );
            if (other) {
              const otherPt =
                merge.handle === "start" ? other.start : other.end;
              const dist = Math.sqrt(
                (point.x - otherPt[0]) ** 2 + (point.z - otherPt[2]) ** 2,
              );
              shouldBreak = dist > MERGE_BREAK_THRESHOLD;
            }
          }

          if (shouldBreak) {

            setRectangles((prev) => {
              return prev.map((r) => {
                if (r.id === drag.rectId) {
                  return drag.handle === "start"
                    ? { ...r, mergeStart: undefined, start: newPt }
                    : { ...r, mergeEnd: undefined, end: newPt };
                }

                if (merge.handle !== "midpoint" && r.id === merge.rectId) {
                  if (
                    merge.handle === "start" &&
                    r.mergeStart?.rectId === drag.rectId
                  ) {
                    return { ...r, mergeStart: undefined };
                  }
                  if (
                    merge.handle === "end" &&
                    r.mergeEnd?.rectId === drag.rectId
                  ) {
                    return { ...r, mergeEnd: undefined };
                  }
                }
                return r;
              });
            });
            snapTargetRef.current = null;
            setSnapIndicatorPos(null);
            return;
          }
        }

        if (!isAlreadyMerged) {
          const snap = findSnapTarget(
            new Vector3(newPt[0], 0, newPt[2]),
            drag.rectId,
            rectanglesRef.current,
          );
          const targetRect = snap
            ? rectanglesRef.current.find((r) => r.id === snap.rectId)
            : undefined;
          const hasMatchingRoofType =
            !!snap &&
            !!draggedRect &&
            !!targetRect &&
            (draggedRect.roofType ?? "hip") === (targetRect.roofType ?? "hip");

          if (snap && hasMatchingRoofType) {
            snapTargetRef.current = snap;
            setSnapIndicatorPos([snap.point[0], getControlY(draggedRect), snap.point[2]]);
          } else {
            snapTargetRef.current = null;
            setSnapIndicatorPos(null);
          }
        } else {
          snapTargetRef.current = null;
          setSnapIndicatorPos(null);
        }

        setRectangles((prev) => {
          const dr = prev.find((r) => r.id === drag.rectId);
          if (!dr) return prev;

          const drMerge = drag.handle === "start" ? dr.mergeStart : dr.mergeEnd;

          return prev.map((r) => {
            if (r.id === drag.rectId) {
              return drag.handle === "start"
                ? { ...r, start: newPt }
                : { ...r, end: newPt };
            }

            if (
              drMerge &&
              r.id === drMerge.rectId &&
              drMerge.handle !== "midpoint"
            ) {
              return drMerge.handle === "start"
                ? { ...r, start: newPt }
                : { ...r, end: newPt };
            }
            return r;
          });
        });
      }


      if (drag.type === "rotate") {
        setRectangles((prev) => {
          const dr = prev.find((r) => r.id === drag.rectId);
          if (!dr) return prev;


          const connectedIds = new Set<string>();
          const queue = [drag.rectId];
          const rectMap = new Map(prev.map((r) => [r.id, r]));
          while (queue.length > 0) {
            const id = queue.shift()!;
            if (connectedIds.has(id)) continue;
            connectedIds.add(id);
            const rect = rectMap.get(id);
            if (!rect) continue;
            for (const merge of [rect.mergeStart, rect.mergeEnd]) {
              if (merge && merge.handle !== "midpoint" && !connectedIds.has(merge.rectId)) {
                queue.push(merge.rectId);
              }
            }
          }


          const groupRects = prev.filter((r) => connectedIds.has(r.id));
          let gcx = 0, gcz = 0, count = 0;
          for (const r of groupRects) {
            gcx += r.start[0] + r.end[0];
            gcz += r.start[2] + r.end[2];
            count += 2;
          }
          gcx /= count;
          gcz /= count;

          const oldAngle = Math.atan2(-(dr.end[2] - gcz), dr.end[0] - gcx);
          const newAngle = Math.atan2(-(point.z - gcz), point.x - gcx);
          const deltaAngle = newAngle - oldAngle;

          const cosD = Math.cos(deltaAngle);
          const sinD = Math.sin(deltaAngle);


          return prev.map((r) => {
            if (!connectedIds.has(r.id)) return r;

            const rotatePoint = (px: number, pz: number): [number, number] => {
              const dx = px - gcx;
              const dz = pz - gcz;
              return [
                gcx + dx * cosD + dz * sinD,
                gcz - dx * sinD + dz * cosD,
              ];
            };

            const [ns0, ns2] = rotatePoint(r.start[0], r.start[2]);
            const [ne0, ne2] = rotatePoint(r.end[0], r.end[2]);

            return {
              ...r,
              start: [ns0, 0, ns2] as [number, number, number],
              end: [ne0, 0, ne2] as [number, number, number],
            };
          });
        });
        return;
      }


      if (drag.type === "width") {
        setRectangles((prev) => {
          const dr = prev.find((r) => r.id === drag.rectId);
          if (!dr) return prev;

          const cx = (dr.start[0] + dr.end[0]) / 2;
          const cz = (dr.start[2] + dr.end[2]) / 2;
          const dirX = dr.end[0] - dr.start[0];
          const dirZ = dr.end[2] - dr.start[2];
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
          if (len < 0.001) return prev;


          const perpX = -dirZ / len;
          const perpZ = dirX / len;


          const dx = point.x - cx;
          const dz = point.z - cz;
          const proj = Math.abs(dx * perpX + dz * perpZ);
          const newDepth = Math.max(proj * 2, 0.1);

          const connectedIds = new Set<string>();
          const queue = [drag.rectId];
          const rectMap = new Map(prev.map((r) => [r.id, r]));
          while (queue.length > 0) {
            const id = queue.shift()!;
            if (connectedIds.has(id)) continue;
            connectedIds.add(id);
            const rect = rectMap.get(id);
            if (!rect) continue;
            for (const merge of [rect.mergeStart, rect.mergeEnd]) {
              if (merge && merge.handle !== "midpoint" && !connectedIds.has(merge.rectId)) {
                queue.push(merge.rectId);
              }
            }
          }

          return prev.map((r) =>
            connectedIds.has(r.id) ? { ...r, depth: newDepth } : r,
          );
        });
      }
    },
    [getControlY, setRectangles],
  );

  const onGroundPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const m = modeRef.current;
      const tool = activeToolRef.current;
      const drag = dragRef.current;

      if (e.button === 2) {
        return;
      }

      if (m === "draw" && (tool === "polygon" || tool === "polygon-lot")) {
        const point = rayToGroundPoint(e);
        lastGroundPointRef.current = point.clone();
        if (e.button === 0 && polygonPoints.length >= 3) {
          const first = polygonPoints[0];
          if (Math.hypot(point.x - first.x, point.z - first.z) <= 0.35) {
            finalizePolygonDraft();
          }
        }
        return;
      }


      let didCreateMerge = false;
      if (drag?.type === "handle" && drag.handle && snapTargetRef.current) {
        const snap = snapTargetRef.current;
        const draggedRect = rectanglesRef.current.find((r) => r.id === drag.rectId);
        const targetRect = rectanglesRef.current.find((r) => r.id === snap.rectId);
        const hasMatchingRoofType =
          !!draggedRect &&
          !!targetRect &&
          (draggedRect.roofType ?? "hip") === (targetRect.roofType ?? "hip");

        if (!hasMatchingRoofType) {
          snapTargetRef.current = null;
          setSnapIndicatorPos(null);
        } else if (snap.handle === "midpoint") {
          didCreateMerge = true;

          setRectangles((prev) =>
            prev.map((r) => {
              if (r.id === drag.rectId) {
                const conn: MergeConnection = {
                  rectId: snap.rectId,
                  handle: "midpoint",
                  t: snap.t,
                };
                const alignedShedDirection = getAlignedShedDirection(r, targetRect);
                const synced = alignedShedDirection
                  ? { shedDirection: alignedShedDirection }
                  : {};
                return drag.handle === "start"
                  ? { ...r, ...synced, mergeStart: conn, start: snap.point }
                  : { ...r, ...synced, mergeEnd: conn, end: snap.point };
              }
              return r;
            }),
          );
        } else {
          didCreateMerge = true;
          setRectangles((prev) => {
            const targetRect = prev.find((r) => r.id === snap.rectId);
            const draggedRect = prev.find((r) => r.id === drag.rectId);
            const alignedShedDirection = getAlignedShedDirection(draggedRect, targetRect);
            return prev.map((r) => {
              if (r.id === drag.rectId) {
                const conn: MergeConnection = {
                  rectId: snap.rectId,
                  handle: snap.handle,
                };
                const synced = targetRect
                  ? {
                      depth: targetRect.depth,
                      wallHeight: targetRect.wallHeight,
                      pitchAngle: targetRect.pitchAngle,
                      ...(alignedShedDirection
                        ? { shedDirection: alignedShedDirection }
                        : {}),
                    }
                  : {};
                return drag.handle === "start"
                  ? { ...r, ...synced, mergeStart: conn, start: snap.point }
                  : { ...r, ...synced, mergeEnd: conn, end: snap.point };
              }
              if (r.id === snap.rectId) {
                const conn: MergeConnection = {
                  rectId: drag.rectId,
                  handle: drag.handle!,
                };
                return snap.handle === "start"
                  ? { ...r, mergeStart: conn }
                  : { ...r, mergeEnd: conn };
              }
              return r;
            });
          });
        }
      }

      if (drag && didCreateMerge) {
        const affectedIds = getConnectedRectIds(drag.rectId, false);
        clearSolarPanelsForRects(affectedIds);
      }

      dragRef.current = null;
      snapTargetRef.current = null;
      setSnapIndicatorPos(null);
      setIsDraggingHandle(false);
    },
    [
      setRectangles,
      setIsDraggingHandle,
      getConnectedRectIds,
      clearSolarPanelsForRects,
      finishStandardDraw,
      setLots,
      setSelectedLotId,
      polygonPoints,
      finalizePolygonDraft,
    ],
  );


  const onRectPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, rectId: string) => {
      e.stopPropagation();


      if (
        modeRef.current === "draw" &&
        (activeToolRef.current === "polygon" || activeToolRef.current === "polygon-lot")
      ) {
        const tool = activeToolRef.current;
        if (polygonPoints.length >= 3) {
          const first = polygonPoints[0];
          if (Math.hypot(e.point.x - first.x, e.point.z - first.z) <= 0.35) {
            finalizePolygonDraft();
            return;
          }
        }
        return;
      }

      if (
        modeRef.current === "draw" &&
        activeToolRef.current === "chimney"
      ) {
        const rect = rectanglesRef.current.find((r) => r.id === rectId);
        if (rect) {

          const { localX, localZ } = getChimneyLocalPosition(
            rect,
            e.point.x,
            e.point.z
          );

          const newChimney = {
            id: generateId(),
            rectangleId: rectId,
            shape: "rectangular" as const,
            localX,
            localZ,
            width: 0.4,
            depth: 0.3,
            height: 0.8,
            color: "#8B4513",
          };
          setChimneys((prev) => [...prev, newChimney]);
          setSelectedChimneyId(newChimney.id);
        }
        return;
      }

      setSelectedId(rectId);


      if (modeRef.current === "select" || modeRef.current === "drag") {
        const rect = rectanglesRef.current.find((r) => r.id === rectId);
        if (rect) {
          const cx = (rect.start[0] + rect.end[0]) / 2;
          const cz = (rect.start[2] + rect.end[2]) / 2;
          dragRef.current = {
            type: "rect",
            rectId,
            offset: new Vector3(e.point.x - cx, 0, e.point.z - cz),
          };
          setIsDraggingHandle(true);
        }
      }
    },
    [setSelectedId, setIsDraggingHandle, setChimneys, setSelectedChimneyId, polygonPoints, finalizePolygonDraft],
  );

  const onHandlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, rectId: string, handle: "start" | "end") => {
      e.stopPropagation();
      setSelectedId(rectId);
      setIsDraggingHandle(true);
      dragRef.current = { type: "handle", rectId, handle };
    },
    [setSelectedId, setIsDraggingHandle],
  );

  const onWidthHandlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, rectId: string, side: "left" | "right") => {
      e.stopPropagation();
      setSelectedId(rectId);
      setIsDraggingHandle(true);
      dragRef.current = { type: "width", rectId, widthSide: side };
    },
    [setSelectedId, setIsDraggingHandle],
  );

  const onRotateHandlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, rectId: string) => {
      e.stopPropagation();
      setSelectedId(rectId);
      setIsDraggingHandle(true);
      dragRef.current = { type: "rotate", rectId };
    },
    [setSelectedId, setIsDraggingHandle],
  );

  const onToggleCap = useCallback(
    (rectId: string, end: "start" | "end") => {
      setRectangles((prev) =>
        prev.map((r) => {
          if (r.id !== rectId) return r;
          if (end === "start") {
            const next: EndCapType = r.startCap === "flat" ? "pointed" : "flat";
            return { ...r, startCap: next };
          } else {
            const next: EndCapType = r.endCap === "flat" ? "pointed" : "flat";
            return { ...r, endCap: next };
          }
        }),
      );
    },
    [setRectangles],
  );

  const onBreakConnection = useCallback(
    (rectId: string, end: "start" | "end") => {
      setRectangles((prev) => {

        const rect = prev.find((r) => r.id === rectId);
        if (!rect) return prev;

        const merge = end === "start" ? rect.mergeStart : rect.mergeEnd;
        if (!merge) return prev;


        return prev.map((r) => {
          if (r.id === rectId) {
            return end === "start"
              ? { ...r, mergeStart: undefined }
              : { ...r, mergeEnd: undefined };
          }

          if (merge.handle !== "midpoint" && r.id === merge.rectId) {
            if (merge.handle === "start" && r.mergeStart?.rectId === rectId) {
              return { ...r, mergeStart: undefined };
            }
            if (merge.handle === "end" && r.mergeEnd?.rectId === rectId) {
              return { ...r, mergeEnd: undefined };
            }
          }
          return r;
        });
      });
    },
    [setRectangles],
  );


  return (
    <group onPointerMove={onGroundPointerMove} onPointerUp={onGroundPointerUp}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onPointerDown={onGroundPointerDown}
        onContextMenu={onGroundContextMenu}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {preview && <DrawPreview start={preview.start} end={preview.end} />}

      {polygonPoints.length > 0 && (
        <PolygonDraftPreview points={polygonPoints} hoverPoint={polygonHoverPoint} />
      )}

      {snapIndicatorPos && (
        <mesh
          position={snapIndicatorPos}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.25, 0.03, 8, 24]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
      )}

      {renderControls &&
        rectangles.map((rect) => {
          const selectedRect = rectangles.find((r) => r.id === selectedId);
          const isSelected = rect.id === selectedId;
          const showMergeHandles =
            controlsOnRoof &&
            !!selectedRect &&
            !isSelected &&
            (selectedRect.roofType ?? "hip") === (rect.roofType ?? "hip");

          return (
            <RectangleGroup
              key={rect.id}
              rect={rect}
              allRects={rectangles}
              isSelected={isSelected}
              onRectPointerDown={onRectPointerDown}
              onHandlePointerDown={onHandlePointerDown}
              onWidthHandlePointerDown={onWidthHandlePointerDown}
              onToggleCap={onToggleCap}
              onRotateHandlePointerDown={onRotateHandlePointerDown}
              onBreakConnection={onBreakConnection}
              controlsOnly={!renderRectangles}
              controlsOnRoof={controlsOnRoof}
              showMergeHandles={showMergeHandles}
            />
          );
        })}
    </group>
  );
};
