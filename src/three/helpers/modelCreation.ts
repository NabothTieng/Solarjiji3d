import * as THREE from "three";
import {
  type Rectangle3D,
  type MergeConnection,
  type RoofType,
} from "../store/rectangleStore";
import type { SnapTarget } from "../../types";
import { MERGE_SNAP_THRESHOLD, PITCH_SLOPE, Y_LINE, Y_SURFACE } from "../constants";

export function getRectangleControlY(rect: Rectangle3D): number {
  const wallHeight = rect.wallHeight ?? 0.8;
  const pitchSlope = rect.pitchAngle ?? PITCH_SLOPE;
  const roofType = rect.roofType ?? "hip";
  const roofRise = roofType === "flat" ? 0.02 : (rect.depth / 2) * pitchSlope;
  return Math.max(Y_LINE, wallHeight + roofRise + 0.35);
}

export interface QuadCorners {
  sr: THREE.Vector2;
  sl: THREE.Vector2;
  el: THREE.Vector2;
  er: THREE.Vector2;
  startCenter: THREE.Vector2;
  endCenter: THREE.Vector2;
  pitchStart: boolean;
  pitchEnd: boolean;
  mergedStart: boolean;
  mergedEnd: boolean;
}

function lineIntersection2D(
  p1: THREE.Vector2,
  d1: THREE.Vector2,
  p2: THREE.Vector2,
  d2: THREE.Vector2,
): THREE.Vector2 | null {
  const cross = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(cross) < 1e-8) return null;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * d2.y - dy * d2.x) / cross;
  return new THREE.Vector2(p1.x + t * d1.x, p1.y + t * d1.y);
}

function computeMergedEndCorners(
  mergePoint: THREE.Vector2,
  dirAway: THREE.Vector2,
  perp: THREE.Vector2,
  halfD: number,
  merge: MergeConnection,
  allRects: Rectangle3D[],
): { left: THREE.Vector2; right: THREE.Vector2 } | null {
  const other = allRects.find((r) => r.id === merge.rectId);
  if (!other) return null;

  const otherS = new THREE.Vector2(other.start[0], other.start[2]);
  const otherE = new THREE.Vector2(other.end[0], other.end[2]);

  let otherDirAway: THREE.Vector2;
  if (merge.handle === "start") {
    otherDirAway = otherE.clone().sub(otherS);
  } else {
    otherDirAway = otherS.clone().sub(otherE);
  }
  if (otherDirAway.length() < 0.001) return null;
  otherDirAway.normalize();

  const bisector = dirAway.clone().add(otherDirAway);
  if (bisector.length() < 0.001) return null;
  bisector.normalize();

  const leftPt = mergePoint.clone().add(perp.clone().multiplyScalar(halfD));
  const rightPt = mergePoint.clone().sub(perp.clone().multiplyScalar(halfD));

  const left = lineIntersection2D(leftPt, dirAway, mergePoint, bisector);
  const right = lineIntersection2D(rightPt, dirAway, mergePoint, bisector);

  if (!left || !right) return null;
  return { left, right };
}


function clipCornersToTargetEdge(
  _s: THREE.Vector2,
  _e: THREE.Vector2,
  dir: THREE.Vector2,
  _perp: THREE.Vector2,
  _halfD: number,
  cornerLeft: THREE.Vector2,
  cornerRight: THREE.Vector2,
  mergedEnd: "start" | "end",
  merge: MergeConnection,
  allRects: Rectangle3D[],
): { left: THREE.Vector2; right: THREE.Vector2 } | null {
  const target = allRects.find((r) => r.id === merge.rectId);
  if (!target || merge.t === undefined) return null;

  const tS = new THREE.Vector2(target.start[0], target.start[2]);
  const tE = new THREE.Vector2(target.end[0], target.end[2]);
  const tDir = tE.clone().sub(tS);
  const tLen = tDir.length();
  if (tLen < 0.001) return null;
  tDir.normalize();
  const tPerp = new THREE.Vector2(-tDir.y, tDir.x);
  const halfTargetD = target.depth / 2;


  const mergePoint = tS.clone().lerp(tE, merge.t);


  const bodyDir = mergedEnd === "start" ? dir.clone() : dir.clone().negate();


  const dotPerp = bodyDir.dot(tPerp);
  const edgeSign = dotPerp >= 0 ? 1 : -1;


  const edgePt = mergePoint
    .clone()
    .add(tPerp.clone().multiplyScalar(edgeSign * halfTargetD));


  const moveDir = mergedEnd === "start" ? dir : dir.clone().negate();
  const newLeft = lineIntersection2D(cornerLeft, moveDir, edgePt, tDir);
  const newRight = lineIntersection2D(cornerRight, moveDir, edgePt, tDir);

  if (!newLeft || !newRight) return null;
  return { left: newLeft, right: newRight };
}

export function computeRectCorners(
  rect: Rectangle3D,
  allRects: Rectangle3D[],
): QuadCorners {
  if (rect.polygonFootprint && rect.polygonFootprint.length >= 3) {
    const points = rect.polygonFootprint.map((p) => new THREE.Vector2(p[0], p[2]));
    const first = points[0];
    const second = points[1] ?? first;
    return {
      sr: first.clone(),
      sl: second.clone(),
      el: points[2]?.clone() ?? second.clone(),
      er: points[points.length - 1].clone(),
      startCenter: first.clone(),
      endCenter: second.clone(),
      pitchStart: false,
      pitchEnd: false,
      mergedStart: false,
      mergedEnd: false,
    };
  }

  const s = new THREE.Vector2(rect.start[0], rect.start[2]);
  const e = new THREE.Vector2(rect.end[0], rect.end[2]);
  const centerDir = e.clone().sub(s);
  const len = centerDir.length();

  if (len < 0.001) {
    const h = rect.depth / 2;
    return {
      sr: new THREE.Vector2(s.x - h, s.y - h),
      sl: new THREE.Vector2(s.x + h, s.y - h),
      el: new THREE.Vector2(s.x + h, s.y + h),
      er: new THREE.Vector2(s.x - h, s.y + h),
      startCenter: s.clone(),
      endCenter: e.clone(),
      pitchStart: false,
      pitchEnd: false,
      mergedStart: false,
      mergedEnd: false,
    };
  }

  const dir = centerDir.clone().normalize();
  const perp = new THREE.Vector2(-dir.y, dir.x);
  const halfD = rect.depth / 2;


  let sl = s.clone().add(perp.clone().multiplyScalar(halfD));
  let sr = s.clone().sub(perp.clone().multiplyScalar(halfD));
  let el = e.clone().add(perp.clone().multiplyScalar(halfD));
  let er = e.clone().sub(perp.clone().multiplyScalar(halfD));

  const pitchStart = !rect.mergeStart && rect.startCap === "pointed";
  const pitchEnd = !rect.mergeEnd && rect.endCap === "pointed";


  if (rect.mergeStart && rect.mergeStart.handle !== "midpoint") {
    const adj = computeMergedEndCorners(
      s,
      dir,
      perp,
      halfD,
      rect.mergeStart,
      allRects,
    );
    if (adj) {
      sl = adj.left;
      sr = adj.right;
    }
  }

  if (rect.mergeEnd && rect.mergeEnd.handle !== "midpoint") {
    const negDir = dir.clone().negate();
    const adj = computeMergedEndCorners(
      e,
      negDir,
      perp,
      halfD,
      rect.mergeEnd,
      allRects,
    );
    if (adj) {
      el = adj.left;
      er = adj.right;
    }
  }


  if (rect.mergeStart?.handle === "midpoint") {
    const clipped = clipCornersToTargetEdge(
      s,
      e,
      dir,
      perp,
      halfD,
      sl,
      sr,
      "start",
      rect.mergeStart,
      allRects,
    );
    if (clipped) {
      sl = clipped.left;
      sr = clipped.right;
    }
  }

  if (rect.mergeEnd?.handle === "midpoint") {
    const clipped = clipCornersToTargetEdge(
      s,
      e,
      dir,
      perp,
      halfD,
      el,
      er,
      "end",
      rect.mergeEnd,
      allRects,
    );
    if (clipped) {
      el = clipped.left;
      er = clipped.right;
    }
  }

  return { sr, sl, el, er, startCenter: s, endCenter: e, pitchStart, pitchEnd, mergedStart: !!rect.mergeStart, mergedEnd: !!rect.mergeEnd };
}

export function createPolygonFlatGeometry(
  footprint: [number, number, number][],
): THREE.BufferGeometry {
  const flatY = Y_SURFACE + 0.02;
  const vertices2D = footprint.map((p) => new THREE.Vector2(p[0], p[2]));
  const triangles = THREE.ShapeUtils.triangulateShape(vertices2D, []);
  const positions = footprint.flatMap((p) => [p[0], flatY, p[2]]);
  const indices = triangles.flat();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return geo;
}

export function createQuadGeometry(
  corners: QuadCorners,
  depth: number,
  roofType: RoofType,
  shedDirection: "left" | "right" = "left",
): THREE.BufferGeometry {
  const { sr, sl, el, er, startCenter, endCenter } = corners;
  const y = Y_SURFACE;
  const ridgeH = y + (depth / 2) * PITCH_SLOPE;


  const positions: number[] = [
    sr.x,
    y,
    sr.y,
    sl.x,
    y,
    sl.y,
    el.x,
    y,
    el.y,
    er.x,
    y,
    er.y,
  ];

  const indices: number[] = [];

  switch (roofType) {
    case "flat": {

      const flatY = y + 0.02;
      positions[1] = flatY;
      positions[4] = flatY;
      positions[7] = flatY;
      positions[10] = flatY;
      indices.push(0, 3, 2, 0, 2, 1);
      break;
    }

    case "shed": {

      const highY = y + (depth / 2) * PITCH_SLOPE;
      if (shedDirection === "right") {
        positions[1] = highY;
        positions[10] = highY;
      } else {
        positions[4] = highY;
        positions[7] = highY;
      }
      indices.push(0, 3, 2, 0, 2, 1);
      break;
    }

    case "hip": {

      const ridgeInset = depth * 0.3;


      const startInset = corners.mergedStart ? 0 : ridgeInset;
      const endInset = corners.mergedEnd ? 0 : ridgeInset;

      const ridgeStartIdx = positions.length / 3;


      const sv = new THREE.Vector2(startCenter.x, startCenter.y);
      const ev = new THREE.Vector2(endCenter.x, endCenter.y);
      const dir = ev.clone().sub(sv);
      const len = dir.length();

      if (len > startInset + endInset) {
        dir.normalize();
        const ridgeStart = sv
          .clone()
          .add(dir.clone().multiplyScalar(startInset));
        const ridgeEnd = ev.clone().sub(dir.clone().multiplyScalar(endInset));

        positions.push(ridgeStart.x, ridgeH, ridgeStart.y);
        const ridgeEndIdx = positions.length / 3;
        positions.push(ridgeEnd.x, ridgeH, ridgeEnd.y);


        indices.push(1, 2, ridgeEndIdx);
        indices.push(1, ridgeEndIdx, ridgeStartIdx);
        indices.push(0, ridgeStartIdx, ridgeEndIdx);
        indices.push(0, ridgeEndIdx, 3);


        if (!corners.mergedStart) {
          indices.push(0, 1, ridgeStartIdx);
        }
        if (!corners.mergedEnd) {
          indices.push(2, 3, ridgeEndIdx);
        }
      } else {

        const peakIdx = positions.length / 3;
        const cx = (startCenter.x + endCenter.x) / 2;
        const cz = (startCenter.y + endCenter.y) / 2;
        positions.push(cx, ridgeH, cz);
        indices.push(0, 1, peakIdx);
        indices.push(1, 2, peakIdx);
        indices.push(2, 3, peakIdx);
        indices.push(3, 0, peakIdx);
      }
      break;
    }

    case "gambrel": {


      indices.push(0, 3, 2, 0, 2, 1);
      break;
    }

    default: {

      indices.push(0, 3, 2, 0, 2, 1);
      break;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3),
  );
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return geo;
}

export function findSnapTarget(
  pos: THREE.Vector3,
  excludeRectId: string,
  rects: Rectangle3D[],
): SnapTarget | null {
  let bestEndpoint: SnapTarget | null = null;
  let bestEndpointDist = MERGE_SNAP_THRESHOLD;

  let bestMidpoint: SnapTarget | null = null;
  let bestMidpointDist = MERGE_SNAP_THRESHOLD;

  for (const r of rects) {
    if (r.id === excludeRectId) continue;


    for (const h of ["start", "end"] as const) {
      const alreadyMerged = h === "start" ? r.mergeStart : r.mergeEnd;
      if (alreadyMerged) continue;
      const p = h === "start" ? r.start : r.end;
      const dist = Math.sqrt((pos.x - p[0]) ** 2 + (pos.z - p[2]) ** 2);
      if (dist < bestEndpointDist) {
        bestEndpointDist = dist;
        bestEndpoint = {
          rectId: r.id,
          handle: h,
          point: [...p] as [number, number, number],
        };
      }
    }


    const sx = r.start[0],
      sz = r.start[2];
    const ex = r.end[0],
      ez = r.end[2];
    const dx = ex - sx,
      dz = ez - sz;
    const len2 = dx * dx + dz * dz;
    if (len2 > 0.001) {
      let t = ((pos.x - sx) * dx + (pos.z - sz) * dz) / len2;

      t = Math.max(0.15, Math.min(0.85, t));
      const closestX = sx + t * dx;
      const closestZ = sz + t * dz;
      const dist = Math.sqrt((pos.x - closestX) ** 2 + (pos.z - closestZ) ** 2);
      if (dist < bestMidpointDist) {
        bestMidpointDist = dist;
        bestMidpoint = {
          rectId: r.id,
          handle: "midpoint",
          point: [closestX, 0, closestZ],
          t,
        };
      }
    }
  }


  return bestEndpoint || bestMidpoint;
}
