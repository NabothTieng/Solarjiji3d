import { useMemo } from "react";
import { Vector2, Vector3 } from "three";
import { Y_LINE } from "../../../constants";
import type { QuadCorners } from "../../../helpers/modelCreation";
import type { RoofType } from "../../../store/rectangleStore";

export function useRoofLines(
  corners: QuadCorners,
  depth: number,
  roofType: RoofType,
  shedDirection: "left" | "right" = "left",
) {
  const ridgePoints = useMemo(() => {
    if (roofType === "flat") return null;

    const { startCenter, endCenter, sl, el, sr, er } = corners;
    const ridgeY = Y_LINE + 0.01;
    const pts: Vector3[] = [];

    if (roofType === "shed") {

      const hStart = shedDirection === "left" ? sl : sr;
      const hEnd = shedDirection === "left" ? el : er;
      pts.push(new Vector3(hStart.x, ridgeY, hStart.y));
      pts.push(new Vector3(hEnd.x, ridgeY, hEnd.y));
    } else if (roofType === "hip") {
      const ridgeInset = depth * 0.3;
      const sv = new Vector2(startCenter.x, startCenter.y);
      const ev = new Vector2(endCenter.x, endCenter.y);
      const dir = ev.clone().sub(sv);
      const len = dir.length();

      if (len > ridgeInset * 2) {
        dir.normalize();
        const ridgeStart = sv
          .clone()
          .add(dir.clone().multiplyScalar(ridgeInset));
        const ridgeEnd = ev.clone().sub(dir.clone().multiplyScalar(ridgeInset));
        pts.push(new Vector3(ridgeStart.x, ridgeY, ridgeStart.y));
        pts.push(new Vector3(ridgeEnd.x, ridgeY, ridgeEnd.y));
      }
    } else if (roofType === "gambrel") {
      pts.push(new Vector3(startCenter.x, ridgeY, startCenter.y));
      pts.push(new Vector3(endCenter.x, ridgeY, endCenter.y));
    }

    return pts.length >= 2 ? pts : null;
  }, [corners, depth, roofType, shedDirection]);

  const hipLines = useMemo(() => {
    if (roofType !== "hip") return null;

    const { sr, sl, er, el } = corners;
    const ridgeY = Y_LINE + 0.01;
    const ridgeInset = depth * 0.3;
    const sv = new Vector2(corners.startCenter.x, corners.startCenter.y);
    const ev = new Vector2(corners.endCenter.x, corners.endCenter.y);
    const dir = ev.clone().sub(sv);
    const len = dir.length();

    if (len <= ridgeInset * 2) {
      const cx = (sr.x + sl.x + er.x + el.x) / 4;
      const cz = (sr.y + sl.y + er.y + el.y) / 4;
      const peak = new Vector3(cx, ridgeY, cz);
      return [
        [new Vector3(sr.x, ridgeY, sr.y), peak],
        [new Vector3(sl.x, ridgeY, sl.y), peak],
        [new Vector3(er.x, ridgeY, er.y), peak],
        [new Vector3(el.x, ridgeY, el.y), peak],
      ];
    }

    dir.normalize();
    const ridgeStart = sv.clone().add(dir.clone().multiplyScalar(ridgeInset));
    const ridgeEnd = ev.clone().sub(dir.clone().multiplyScalar(ridgeInset));
    const ridgeStartPt = new Vector3(ridgeStart.x, ridgeY, ridgeStart.y);
    const ridgeEndPt = new Vector3(ridgeEnd.x, ridgeY, ridgeEnd.y);

    return [
      [ridgeStartPt, new Vector3(sr.x, ridgeY, sr.y)],
      [ridgeStartPt, new Vector3(sl.x, ridgeY, sl.y)],
      [ridgeEndPt, new Vector3(er.x, ridgeY, er.y)],
      [ridgeEndPt, new Vector3(el.x, ridgeY, el.y)],
    ];
  }, [corners, depth, roofType]);

  const gambrelLines = useMemo(() => {
    if (roofType !== "gambrel") return null;

    const { sr, sl, er, el, startCenter, endCenter } = corners;
    const lineY = Y_LINE + 0.01;
    const halfD = depth / 2;
    const breakInset = halfD * 0.4;

    const sv = new Vector2(startCenter.x, startCenter.y);
    const ev = new Vector2(endCenter.x, endCenter.y);
    const centerDir = ev.clone().sub(sv);
    const centerLen = centerDir.length();
    if (centerLen < 0.001) return null;
    centerDir.normalize();
    const perp = new Vector2(-centerDir.y, centerDir.x);

    const breakLeftStart = new Vector2(sl.x, sl.y).sub(
      perp.clone().multiplyScalar(breakInset),
    );
    const breakLeftEnd = new Vector2(el.x, el.y).sub(
      perp.clone().multiplyScalar(breakInset),
    );
    const breakRightStart = new Vector2(sr.x, sr.y).add(
      perp.clone().multiplyScalar(breakInset),
    );
    const breakRightEnd = new Vector2(er.x, er.y).add(
      perp.clone().multiplyScalar(breakInset),
    );

    return {
      leftBreak: [
        new Vector3(breakLeftStart.x, lineY, breakLeftStart.y),
        new Vector3(breakLeftEnd.x, lineY, breakLeftEnd.y),
      ],
      rightBreak: [
        new Vector3(breakRightStart.x, lineY, breakRightStart.y),
        new Vector3(breakRightEnd.x, lineY, breakRightEnd.y),
      ],
    };
  }, [corners, depth, roofType]);

  const shedArrow = useMemo(() => {
    if (roofType !== "shed") return null;

    const { sr, sl, er, el } = corners;
    const arrowY = Y_LINE + 0.01;


    const highMid =
      shedDirection === "left"
        ? new Vector2((sl.x + el.x) / 2, (sl.y + el.y) / 2)
        : new Vector2((sr.x + er.x) / 2, (sr.y + er.y) / 2);
    const lowMid =
      shedDirection === "left"
        ? new Vector2((sr.x + er.x) / 2, (sr.y + er.y) / 2)
        : new Vector2((sl.x + el.x) / 2, (sl.y + el.y) / 2);
    const dir = lowMid.clone().sub(highMid).normalize();
    const arrowLength = depth * 0.4;
    const arrowHeadSize = depth * 0.15;

    const bodyStart = highMid
      .clone()
      .add(dir.clone().multiplyScalar(depth * 0.1));
    const bodyEnd = bodyStart
      .clone()
      .add(dir.clone().multiplyScalar(arrowLength));

    const perp = new Vector2(-dir.y, dir.x);
    const headLeft = bodyEnd
      .clone()
      .sub(dir.clone().multiplyScalar(arrowHeadSize))
      .add(perp.clone().multiplyScalar(arrowHeadSize * 0.5));
    const headRight = bodyEnd
      .clone()
      .sub(dir.clone().multiplyScalar(arrowHeadSize))
      .sub(perp.clone().multiplyScalar(arrowHeadSize * 0.5));

    return {
      body: [
        new Vector3(bodyStart.x, arrowY, bodyStart.y),
        new Vector3(bodyEnd.x, arrowY, bodyEnd.y),
      ],
      head: [
        new Vector3(headLeft.x, arrowY, headLeft.y),
        new Vector3(bodyEnd.x, arrowY, bodyEnd.y),
        new Vector3(headRight.x, arrowY, headRight.y),
      ],
    };
  }, [corners, depth, roofType, shedDirection]);

  return { ridgePoints, hipLines, gambrelLines, shedArrow };
}
