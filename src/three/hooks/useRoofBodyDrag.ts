import { useCallback, useEffect, useRef } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { useAtom, useSetAtom } from "jotai";
import { Vector3 } from "three";
import {
  isDraggingHandleAtom,
  rectanglesAtom,
  selectedRectangleIdAtom,
} from "../store/rectangleStore";

interface RoofDragState {
  rectId: string;
  offset: Vector3;
}

function rayToGround(e: ThreeEvent<PointerEvent>) {
  const { ray } = e;
  if (Math.abs(ray.direction.y) < 1e-6) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (!Number.isFinite(t)) return null;
  return {
    x: ray.origin.x + t * ray.direction.x,
    z: ray.origin.z + t * ray.direction.z,
  };
}

export function useRoofBodyDrag() {
  const [rectangles, setRectangles] = useAtom(rectanglesAtom);
  const setSelectedRectangleId = useSetAtom(selectedRectangleIdAtom);
  const setIsDraggingHandle = useSetAtom(isDraggingHandleAtom);
  const rectanglesRef = useRef(rectangles);
  const dragRef = useRef<RoofDragState | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    rectanglesRef.current = rectangles;
  }, [rectangles]);

  const startRoofDrag = useCallback(
    (e: ThreeEvent<PointerEvent>, rectId: string) => {
      const rect = rectanglesRef.current.find((r) => r.id === rectId);
      if (!rect) return false;

      const ground = rayToGround(e) ?? { x: e.point.x, z: e.point.z };
      const cx = (rect.start[0] + rect.end[0]) / 2;
      const cz = (rect.start[2] + rect.end[2]) / 2;

      e.stopPropagation();
      setSelectedRectangleId(rectId);
      setIsDraggingHandle(true);
      dragRef.current = {
        rectId,
        offset: new Vector3(ground.x - cx, 0, ground.z - cz),
      };
      didDragRef.current = false;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return true;
    },
    [setIsDraggingHandle, setSelectedRectangleId],
  );

  const moveRoofDrag = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const drag = dragRef.current;
      if (!drag) return false;

      e.stopPropagation();
      const ground = rayToGround(e);
      if (!ground) return true;

      setRectangles((prev) => {
        const draggedRect = prev.find((r) => r.id === drag.rectId);
        if (!draggedRect) return prev;

        const oldCX = (draggedRect.start[0] + draggedRect.end[0]) / 2;
        const oldCZ = (draggedRect.start[2] + draggedRect.end[2]) / 2;
        const dx = ground.x - drag.offset.x - oldCX;
        const dz = ground.z - drag.offset.z - oldCZ;

        if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return prev;
        didDragRef.current = true;

        const mergeUpdates = new Map<
          string,
          { h: "start" | "end"; pos: [number, number, number] }
        >();
        if (draggedRect.mergeStart && draggedRect.mergeStart.handle !== "midpoint") {
          mergeUpdates.set(draggedRect.mergeStart.rectId, {
            h: draggedRect.mergeStart.handle,
            pos: [draggedRect.start[0] + dx, 0, draggedRect.start[2] + dz],
          });
        }
        if (draggedRect.mergeEnd && draggedRect.mergeEnd.handle !== "midpoint") {
          mergeUpdates.set(draggedRect.mergeEnd.rectId, {
            h: draggedRect.mergeEnd.handle,
            pos: [draggedRect.end[0] + dx, 0, draggedRect.end[2] + dz],
          });
        }

        const fullMoves = new Set<string>();
        prev.forEach((r) => {
          if (r.id === drag.rectId) return;
          if (
            r.mergeStart?.handle === "midpoint" &&
            r.mergeStart.rectId === drag.rectId
          ) {
            fullMoves.add(r.id);
          }
          if (
            r.mergeEnd?.handle === "midpoint" &&
            r.mergeEnd.rectId === drag.rectId
          ) {
            fullMoves.add(r.id);
          }
        });

        return prev.map((r) => {
          if (r.id === drag.rectId || fullMoves.has(r.id)) {
            return {
              ...r,
              polygonFootprint: r.polygonFootprint?.map((p) =>
                [p[0] + dx, 0, p[2] + dz] as [number, number, number],
              ),
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

          const mergeUpdate = mergeUpdates.get(r.id);
          if (mergeUpdate) {
            return mergeUpdate.h === "start"
              ? { ...r, start: mergeUpdate.pos }
              : { ...r, end: mergeUpdate.pos };
          }

          return r;
        });
      });

      return true;
    },
    [setRectangles],
  );

  const endRoofDrag = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const drag = dragRef.current;
      if (!drag) return false;

      dragRef.current = null;
      setIsDraggingHandle(false);
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {

      }

      e.stopPropagation();
      return true;
    },
    [setIsDraggingHandle],
  );

  const consumeRoofDragClick = useCallback(() => {
    if (!didDragRef.current) return false;
    didDragRef.current = false;
    return true;
  }, []);

  return {
    startRoofDrag,
    moveRoofDrag,
    endRoofDrag,
    consumeRoofDragClick,
  };
}