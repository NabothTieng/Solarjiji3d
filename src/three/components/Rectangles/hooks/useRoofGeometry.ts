import { useMemo } from "react";
import { Vector3 } from "three";
import { Y_LINE } from "../../../constants";
import {
  computeRectCorners,
  createPolygonFlatGeometry,
  createQuadGeometry,
} from "../../../helpers/modelCreation";
import type { Rectangle3D } from "../../../store/rectangleStore";

export function useRoofGeometry(rect: Rectangle3D, allRects: Rectangle3D[]) {
  const roofType = rect.roofType ?? "hip";
  const shedDirection = rect.shedDirection ?? "left";

  const corners = useMemo(
    () => computeRectCorners(rect, allRects),
    [rect, allRects],
  );

  const geometry = useMemo(
    () => rect.polygonFootprint && rect.polygonFootprint.length >= 3
      ? createPolygonFlatGeometry(rect.polygonFootprint)
      : createQuadGeometry(corners, rect.depth, roofType, shedDirection),
    [corners, rect.depth, roofType, shedDirection, rect.polygonFootprint],
  );

  const startPt = useMemo(
    () => new Vector3(rect.start[0], Y_LINE, rect.start[2]),
    [rect.start],
  );

  const endPt = useMemo(
    () => new Vector3(rect.end[0], Y_LINE, rect.end[2]),
    [rect.end],
  );

  const outlinePoints = useMemo(() => {
    if (rect.polygonFootprint && rect.polygonFootprint.length >= 3) {
      const points = rect.polygonFootprint.map((p) => new Vector3(p[0], Y_LINE, p[2]));
      return [...points, points[0].clone()];
    }

    const { sr, sl, el, er } = corners;
    return [
      new Vector3(sr.x, Y_LINE, sr.y),
      new Vector3(sl.x, Y_LINE, sl.y),
      new Vector3(el.x, Y_LINE, el.y),
      new Vector3(er.x, Y_LINE, er.y),
      new Vector3(sr.x, Y_LINE, sr.y),
    ];
  }, [corners, rect.polygonFootprint]);

  return { corners, geometry, startPt, endPt, outlinePoints, roofType, shedDirection };
}
