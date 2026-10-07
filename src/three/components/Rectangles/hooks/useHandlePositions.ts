import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Vector2, Vector3 } from "three";
import { Y_LINE } from "../../../constants";
import type { Rectangle3D } from "../../../store/rectangleStore";

export function useHandlePositions(rect: Rectangle3D, endPt: Vector3) {
  const { widthLeft, widthRight } = useMemo(() => {
    const s = new Vector2(rect.start[0], rect.start[2]);
    const e = new Vector2(rect.end[0], rect.end[2]);
    const mid = s.clone().add(e).multiplyScalar(0.5);
    const dir = e.clone().sub(s);
    const len = dir.length();
    if (len < 0.001) {
      return {
        widthLeft: new Vector3(mid.x, Y_LINE, mid.y),
        widthRight: new Vector3(mid.x, Y_LINE, mid.y),
      };
    }
    dir.normalize();
    const perp = new Vector2(-dir.y, dir.x);
    const halfD = rect.depth / 2;
    return {
      widthLeft: new Vector3(
        mid.x + perp.x * halfD,
        Y_LINE,
        mid.y + perp.y * halfD,
      ),
      widthRight: new Vector3(
        mid.x - perp.x * halfD,
        Y_LINE,
        mid.y - perp.y * halfD,
      ),
    };
  }, [rect]);

  const { capStartPos, capEndPos } = useMemo(() => {
    const sv = new Vector2(rect.start[0], rect.start[2]);
    const ev = new Vector2(rect.end[0], rect.end[2]);
    const d = ev.clone().sub(sv);
    const len = d.length();
    if (len < 0.001) {
      return {
        capStartPos: new Vector3(sv.x, Y_LINE + 0.05, sv.y),
        capEndPos: new Vector3(ev.x, Y_LINE + 0.05, ev.y),
      };
    }
    d.normalize();
    const perp = new Vector2(-d.y, d.x);
    const offset = rect.depth / 2 + 0.2;
    return {
      capStartPos: new Vector3(
        sv.x + perp.x * offset,
        Y_LINE + 0.05,
        sv.y + perp.y * offset,
      ),
      capEndPos: new Vector3(
        ev.x + perp.x * offset,
        Y_LINE + 0.05,
        ev.y + perp.y * offset,
      ),
    };
  }, [rect]);

  const { breakStartPos, breakEndPos } = useMemo(() => {
    const sv = new Vector2(rect.start[0], rect.start[2]);
    const ev = new Vector2(rect.end[0], rect.end[2]);
    const d = ev.clone().sub(sv);
    const len = d.length();
    if (len < 0.001) {
      return {
        breakStartPos: new Vector3(sv.x, Y_LINE + 0.1, sv.y),
        breakEndPos: new Vector3(ev.x, Y_LINE + 0.1, ev.y),
      };
    }
    d.normalize();
    const perp = new Vector2(-d.y, d.x);
    const offset = rect.depth / 2 + 0.25;
    return {
      breakStartPos: new Vector3(
        sv.x - perp.x * offset,
        Y_LINE + 0.1,
        sv.y - perp.y * offset,
      ),
      breakEndPos: new Vector3(
        ev.x - perp.x * offset,
        Y_LINE + 0.1,
        ev.y - perp.y * offset,
      ),
    };
  }, [rect]);

  const cameraZoom = useThree((state) =>
    "isOrthographicCamera" in state.camera && state.camera.isOrthographicCamera
      ? state.camera.zoom
      : 50,
  );

  const rotateOffset = useMemo(
    () => Math.max(0.45, Math.min(0.8, 30 / cameraZoom)),
    [cameraZoom],
  );
  const rotateTorusRadius = useMemo(
    () => Math.max(0.06, Math.min(0.12, 8 / cameraZoom)),
    [cameraZoom],
  );

  const { rotateHandlePos, rotateLinePoints } = useMemo(() => {
    const s = new Vector2(rect.start[0], rect.start[2]);
    const e = new Vector2(rect.end[0], rect.end[2]);
    const dir = e.clone().sub(s);
    const len = dir.length();
    let pos: Vector3;
    if (len < 0.001) {
      pos = new Vector3(e.x, Y_LINE, e.y + rotateOffset);
    } else {
      dir.normalize();
      pos = new Vector3(
        e.x + dir.x * rotateOffset,
        Y_LINE,
        e.y + dir.y * rotateOffset,
      );
    }
    return {
      rotateHandlePos: pos,
      rotateLinePoints: [endPt, pos] as [Vector3, Vector3],
    };
  }, [rect, endPt, rotateOffset]);

  return {
    widthLeft,
    widthRight,
    capStartPos,
    capEndPos,
    breakStartPos,
    breakEndPos,
    rotateHandlePos,
    rotateLinePoints,
    rotateTorusRadius,
  };
}
