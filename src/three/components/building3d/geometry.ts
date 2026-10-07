import * as THREE from "three";
import type {
  Rectangle3D,
  MergeConnection,
  RoofType,
} from "../../store/rectangleStore";

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


  const edgePt = mergePoint.clone().add(tPerp.clone().multiplyScalar(edgeSign * halfTargetD));


  const moveDir = mergedEnd === "start" ? dir : dir.clone().negate();
  const newLeft = lineIntersection2D(cornerLeft, moveDir, edgePt, tDir);
  const newRight = lineIntersection2D(cornerRight, moveDir, edgePt, tDir);

  if (!newLeft || !newRight) return null;
  return { left: newLeft, right: newRight };
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

export function computeRectCorners(
  rect: Rectangle3D,
  allRects: Rectangle3D[],
): QuadCorners {
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
    const adj = computeMergedEndCorners(s, dir, perp, halfD, rect.mergeStart, allRects);
    if (adj) {
      sl = adj.left;
      sr = adj.right;
    }
  }

  if (rect.mergeEnd && rect.mergeEnd.handle !== "midpoint") {
    const negDir = dir.clone().negate();
    const adj = computeMergedEndCorners(e, negDir, perp, halfD, rect.mergeEnd, allRects);
    if (adj) {
      el = adj.left;
      er = adj.right;
    }
  }


  if (rect.mergeStart?.handle === "midpoint") {
    const clipped = clipCornersToTargetEdge(s, e, dir, perp, halfD, sl, sr, "start", rect.mergeStart, allRects);
    if (clipped) {
      sl = clipped.left;
      sr = clipped.right;
    }
  }

  if (rect.mergeEnd?.handle === "midpoint") {
    const clipped = clipCornersToTargetEdge(s, e, dir, perp, halfD, el, er, "end", rect.mergeEnd, allRects);
    if (clipped) {
      el = clipped.left;
      er = clipped.right;
    }
  }

  const mergedStart = !!rect.mergeStart;
  const mergedEnd = !!rect.mergeEnd;

  return { sr, sl, el, er, startCenter: s, endCenter: e, pitchStart, pitchEnd, mergedStart, mergedEnd };
}


export function createWallGeometry(
  corners: QuadCorners,
  wallHeight: number,
  roofType: RoofType = "hip",
  depth = 0,
  pitchSlope = 0,
  shedDirection: "left" | "right" = "left",
): THREE.BufferGeometry {
  const { sr, sl, el, er } = corners;
  const y0 = 0;


  const highY =
    roofType === "shed" ? wallHeight + (depth / 2) * pitchSlope : wallHeight;
  const isLeftHigh = shedDirection === "left";
  const ySr = roofType === "shed" && !isLeftHigh ? highY : wallHeight;
  const ySl = roofType === "shed" && isLeftHigh ? highY : wallHeight;
  const yEl = roofType === "shed" && isLeftHigh ? highY : wallHeight;
  const yEr = roofType === "shed" && !isLeftHigh ? highY : wallHeight;


  const walls: Array<{
    a: THREE.Vector2;
    b: THREE.Vector2;
    yA: number;
    yB: number;
  }> = [
    { a: sr, b: sl, yA: ySr, yB: ySl },
    { a: sl, b: el, yA: ySl, yB: yEl },
    { a: el, b: er, yA: yEl, yB: yEr },
    { a: er, b: sr, yA: yEr, yB: ySr },
  ];

  const positions: number[] = [];
  const indices: number[] = [];

  for (const { a, b, yA, yB } of walls) {
    const idx = positions.length / 3;
    positions.push(a.x, y0, a.y);
    positions.push(b.x, y0, b.y);
    positions.push(b.x, yB, b.y);
    positions.push(a.x, yA, a.y);

    indices.push(idx, idx + 1, idx + 2);
    indices.push(idx, idx + 2, idx + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return geo;
}

export function createPolygonWallGeometry(
  footprint: [number, number, number][],
  wallHeight: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % footprint.length];
    const idx = positions.length / 3;
    positions.push(a[0], 0, a[2]);
    positions.push(b[0], 0, b[2]);
    positions.push(b[0], wallHeight, b[2]);
    positions.push(a[0], wallHeight, a[2]);
    indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return geo;
}


export function createRoofGeometry(
  corners: QuadCorners,
  depth: number,
  wallHeight: number,
  roofType: RoofType,
  pitchSlope: number,
  shedDirection: "left" | "right" = "left",
): THREE.BufferGeometry {
  const { sr, sl, el, er, startCenter, endCenter, mergedStart, mergedEnd } = corners;
  const y = wallHeight;
  const ridgeH = wallHeight + (depth / 2) * pitchSlope;


  const positions: number[] = [
    sr.x, y, sr.y,
    sl.x, y, sl.y,
    el.x, y, el.y,
    er.x, y, er.y,
  ];

  const indices: number[] = [];

  switch (roofType) {
    case "flat": {
      const flatY = wallHeight + 0.02;
      positions[1] = flatY;
      positions[4] = flatY;
      positions[7] = flatY;
      positions[10] = flatY;
      indices.push(0, 1, 2, 0, 2, 3);
      break;
    }

    case "shed": {

      const highY = wallHeight + (depth / 2) * pitchSlope;
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
      const sv = new THREE.Vector2(startCenter.x, startCenter.y);
      const ev = new THREE.Vector2(endCenter.x, endCenter.y);
      const dir = ev.clone().sub(sv);
      const len = dir.length();


      const startInset = mergedStart ? 0 : ridgeInset;
      const endInset = mergedEnd ? 0 : ridgeInset;

      if (len > startInset + endInset) {
        dir.normalize();
        const ridgeStart = sv.clone().add(dir.clone().multiplyScalar(startInset));
        const ridgeEnd = ev.clone().sub(dir.clone().multiplyScalar(endInset));

        const ridgeStartIdx = positions.length / 3;
        positions.push(ridgeStart.x, ridgeH, ridgeStart.y);
        const ridgeEndIdx = positions.length / 3;
        positions.push(ridgeEnd.x, ridgeH, ridgeEnd.y);


        indices.push(1, 2, ridgeEndIdx);
        indices.push(1, ridgeEndIdx, ridgeStartIdx);
        indices.push(0, ridgeStartIdx, ridgeEndIdx);
        indices.push(0, ridgeEndIdx, 3);


        if (!mergedStart) {
          indices.push(0, 1, ridgeStartIdx);
        }
        if (!mergedEnd) {
          indices.push(2, 3, ridgeEndIdx);
        }
      } else {

        const cx = (sr.x + sl.x + er.x + el.x) / 4;
        const cz = (sr.y + sl.y + er.y + el.y) / 4;
        const peakIdx = positions.length / 3;
        positions.push(cx, ridgeH, cz);
        indices.push(0, 1, peakIdx);
        indices.push(1, 2, peakIdx);
        indices.push(2, 3, peakIdx);
        indices.push(3, 0, peakIdx);
      }
      break;
    }

    case "gambrel": {


      const halfD = depth / 2;
      const breakHeight = wallHeight + (halfD * pitchSlope * 0.6);
      const breakInset = halfD * 0.4;


      const sv = new THREE.Vector2(startCenter.x, startCenter.y);
      const ev = new THREE.Vector2(endCenter.x, endCenter.y);
      const centerDir = ev.clone().sub(sv);
      const centerLen = centerDir.length();
      if (centerLen < 0.001) {
        indices.push(0, 3, 2, 0, 2, 1);
        break;
      }
      centerDir.normalize();
      const perp = new THREE.Vector2(-centerDir.y, centerDir.x);


      const breakLeftStart = new THREE.Vector2(sl.x, sl.y).sub(perp.clone().multiplyScalar(breakInset));
      const breakLeftEnd = new THREE.Vector2(el.x, el.y).sub(perp.clone().multiplyScalar(breakInset));


      const breakRightStart = new THREE.Vector2(sr.x, sr.y).add(perp.clone().multiplyScalar(breakInset));
      const breakRightEnd = new THREE.Vector2(er.x, er.y).add(perp.clone().multiplyScalar(breakInset));


      const blsIdx = positions.length / 3;
      positions.push(breakLeftStart.x, breakHeight, breakLeftStart.y);
      const bleIdx = positions.length / 3;
      positions.push(breakLeftEnd.x, breakHeight, breakLeftEnd.y);
      const brsIdx = positions.length / 3;
      positions.push(breakRightStart.x, breakHeight, breakRightStart.y);
      const breIdx = positions.length / 3;
      positions.push(breakRightEnd.x, breakHeight, breakRightEnd.y);


      const ridgeStartIdx = positions.length / 3;
      positions.push(startCenter.x, ridgeH, startCenter.y);
      const ridgeEndIdx = positions.length / 3;
      positions.push(endCenter.x, ridgeH, endCenter.y);


      indices.push(1, bleIdx, blsIdx);
      indices.push(1, 2, bleIdx);

      indices.push(0, brsIdx, breIdx);
      indices.push(0, breIdx, 3);


      indices.push(blsIdx, bleIdx, ridgeEndIdx);
      indices.push(blsIdx, ridgeEndIdx, ridgeStartIdx);

      indices.push(brsIdx, ridgeStartIdx, ridgeEndIdx);
      indices.push(brsIdx, ridgeEndIdx, breIdx);


      indices.push(0, 1, blsIdx);
      indices.push(0, blsIdx, brsIdx);
      indices.push(blsIdx, ridgeStartIdx, brsIdx);

      indices.push(2, 3, breIdx);
      indices.push(2, breIdx, bleIdx);
      indices.push(bleIdx, breIdx, ridgeEndIdx);
      break;
    }

    default: {

      indices.push(0, 1, 2, 0, 2, 3);
      break;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return geo;
}

export function createPolygonRoofGeometry(
  footprint: [number, number, number][],
  wallHeight: number,
): THREE.BufferGeometry {
  const flatY = wallHeight + 0.02;
  const vertices2D = footprint.map((p) => new THREE.Vector2(p[0], p[2]));
  const triangles = THREE.ShapeUtils.triangulateShape(vertices2D, []);
  const positions = footprint.flatMap((p) => [p[0], flatY, p[2]]);
  const indices = triangles.flat();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  geo.computeVertexNormals();
  return geo;
}


export function createGableGeometry(
  _corners: QuadCorners,
  _depth: number,
  _wallHeight: number,
  _roofType: RoofType,
  _pitchSlope: number,
): THREE.BufferGeometry | null {


  void _corners;
  void _depth;
  void _wallHeight;
  void _roofType;
  void _pitchSlope;
  return null;
}
