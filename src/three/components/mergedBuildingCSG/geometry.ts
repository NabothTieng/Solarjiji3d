import * as THREE from "three";
import {
  getChimneyLocalPosition,
  getRectWidth,
  type Rectangle3D,
} from "../../store/rectangleStore";
import { computeRectCorners } from "../../helpers/modelCreation";

const DEFAULT_WALL_HEIGHT = 0.8;
const DEFAULT_PITCH_SLOPE = 0.5;

function buildRectGeometry(
  rect: Rectangle3D,
  allRects: Rectangle3D[],
  ridgeH: number,
): { positions: number[]; indices: number[]; faceScopes: string[] } {
  const wallHeight = rect.wallHeight ?? DEFAULT_WALL_HEIGHT;
  const pitchSlope = rect.pitchAngle ?? DEFAULT_PITCH_SLOPE;
  const roofType = rect.roofType ?? "hip";
  const shedDirection = rect.shedDirection ?? "left";
  const depth = rect.depth;
  const halfD = depth / 2;

  const corners = computeRectCorners(rect, allRects);
  const { sr, sl, el, er, startCenter, endCenter } = corners;
  const startMerged = !!rect.mergeStart;
  const endMerged = !!rect.mergeEnd;

  const y0 = 0;
  const y1 = wallHeight;


  const highY = wallHeight + halfD * pitchSlope;
  const isShed = roofType === "shed";
  const ySr = isShed && shedDirection === "right" ? highY : y1;
  const ySl = isShed && shedDirection === "left" ? highY : y1;
  const yEl = isShed && shedDirection === "left" ? highY : y1;
  const yEr = isShed && shedDirection === "right" ? highY : y1;

  const positions: number[] = [];
  const indices: number[] = [];
  const faceScopes: string[] = [];

  const addQuad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c);
    indices.push(a, c, d);
    faceScopes.push(rect.id, rect.id);
  };

  const addTriangle = (a: number, b: number, c: number) => {
    indices.push(a, b, c);
    faceScopes.push(rect.id);
  };


  positions.push(sr.x, y0, sr.y);
  positions.push(sl.x, y0, sl.y);
  positions.push(el.x, y0, el.y);
  positions.push(er.x, y0, er.y);
  addQuad(0, 1, 2, 3);


  const wb = 4;
  positions.push(sr.x, ySr, sr.y);
  positions.push(sl.x, ySl, sl.y);
  positions.push(el.x, yEl, el.y);
  positions.push(er.x, yEr, er.y);


  if (!startMerged) addQuad(0, 1, wb + 1, wb + 0);
  addQuad(1, 2, wb + 2, wb + 1);
  if (!endMerged) addQuad(2, 3, wb + 3, wb + 2);
  addQuad(3, 0, wb + 0, wb + 3);


  const s = new THREE.Vector2(startCenter.x, startCenter.y);
  const e = new THREE.Vector2(endCenter.x, endCenter.y);

  switch (roofType) {
    case "flat": {
      const flatY = wallHeight + 0.02;
      positions[wb * 3 + 1] = flatY;
      positions[(wb + 1) * 3 + 1] = flatY;
      positions[(wb + 2) * 3 + 1] = flatY;
      positions[(wb + 3) * 3 + 1] = flatY;
      addQuad(wb, wb + 1, wb + 2, wb + 3);
      break;
    }

    case "shed": {


      addQuad(wb + 0, wb + 1, wb + 2, wb + 3);
      break;
    }

    case "hip": {


      const hipInset = depth * 0.3;
      const startInset = startMerged ? 0 : hipInset;
      const endInset = endMerged ? 0 : hipInset;

      const ridgeDir = e.clone().sub(s);
      const ridgeLen = ridgeDir.length();

      if (ridgeLen > startInset + endInset) {
        ridgeDir.normalize();
        const ridgeStart = s
          .clone()
          .add(ridgeDir.clone().multiplyScalar(startInset));
        const ridgeEnd = e
          .clone()
          .sub(ridgeDir.clone().multiplyScalar(endInset));

        const rsIdx = positions.length / 3;
        positions.push(ridgeStart.x, ridgeH, ridgeStart.y);
        const reIdx = positions.length / 3;
        positions.push(ridgeEnd.x, ridgeH, ridgeEnd.y);


        addTriangle(wb + 1, wb + 2, reIdx);
        addTriangle(wb + 1, reIdx, rsIdx);

        addTriangle(wb + 0, rsIdx, reIdx);
        addTriangle(wb + 0, reIdx, wb + 3);

        if (!startMerged) addTriangle(wb + 0, wb + 1, rsIdx);
        if (!endMerged) addTriangle(wb + 2, wb + 3, reIdx);
      } else {

        const cx = (sr.x + sl.x + er.x + el.x) / 4;
        const cz = (sr.y + sl.y + er.y + el.y) / 4;
        const peakIdx = positions.length / 3;
        positions.push(cx, ridgeH, cz);
        addTriangle(wb + 0, wb + 1, peakIdx);
        addTriangle(wb + 1, wb + 2, peakIdx);
        addTriangle(wb + 2, wb + 3, peakIdx);
        addTriangle(wb + 3, wb + 0, peakIdx);
      }
      break;
    }

    case "gambrel": {
      const breakHeight = wallHeight + halfD * pitchSlope * 0.6;
      const breakInset = halfD * 0.4;

      const centerD = e.clone().sub(s);
      if (centerD.length() < 0.001) {
        addQuad(wb + 0, wb + 3, wb + 2, wb + 1);
        break;
      }
      centerD.normalize();
      const gambrelPerp = new THREE.Vector2(-centerD.y, centerD.x);

      const breakLeftStart = new THREE.Vector2(sl.x, sl.y).sub(
        gambrelPerp.clone().multiplyScalar(breakInset),
      );
      const breakLeftEnd = new THREE.Vector2(el.x, el.y).sub(
        gambrelPerp.clone().multiplyScalar(breakInset),
      );
      const breakRightStart = new THREE.Vector2(sr.x, sr.y).add(
        gambrelPerp.clone().multiplyScalar(breakInset),
      );
      const breakRightEnd = new THREE.Vector2(er.x, er.y).add(
        gambrelPerp.clone().multiplyScalar(breakInset),
      );

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


      addTriangle(wb + 1, bleIdx, blsIdx);
      addTriangle(wb + 1, wb + 2, bleIdx);
      addTriangle(wb + 0, brsIdx, breIdx);
      addTriangle(wb + 0, breIdx, wb + 3);

      addTriangle(blsIdx, bleIdx, ridgeEndIdx);
      addTriangle(blsIdx, ridgeEndIdx, ridgeStartIdx);
      addTriangle(brsIdx, ridgeStartIdx, ridgeEndIdx);
      addTriangle(brsIdx, ridgeEndIdx, breIdx);

      addTriangle(wb + 0, wb + 1, blsIdx);
      addTriangle(wb + 0, blsIdx, brsIdx);
      addTriangle(blsIdx, ridgeStartIdx, brsIdx);

      addTriangle(wb + 2, wb + 3, breIdx);
      addTriangle(wb + 2, breIdx, bleIdx);
      addTriangle(bleIdx, breIdx, ridgeEndIdx);
      break;
    }

    default: {
      addQuad(wb + 0, wb + 3, wb + 2, wb + 1);
      break;
    }
  }

  return { positions, indices, faceScopes };
}


export function buildGroupGeometryDirect(
  group: Rectangle3D[],
): { geometry: THREE.BufferGeometry; faceScopes: string[] } | null {
  if (group.length === 0) return null;


  const groupRidgeH = Math.max(
    ...group.map((r) => {
      const wh = r.wallHeight ?? DEFAULT_WALL_HEIGHT;
      const ps = r.pitchAngle ?? DEFAULT_PITCH_SLOPE;
      return wh + (r.depth / 2) * ps;
    }),
  );

  const allPositions: number[] = [];
  const allIndices: number[] = [];
  const allFaceScopes: string[] = [];
  let vertexOffset = 0;

  for (const rect of group) {
    const { positions, indices, faceScopes } = buildRectGeometry(
      rect,
      group,
      groupRidgeH,
    );
    for (const p of positions) allPositions.push(p);
    for (const i of indices) allIndices.push(i + vertexOffset);
    for (const scope of faceScopes) allFaceScopes.push(scope);
    vertexOffset += positions.length / 3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(allPositions), 3),
  );
  geo.setIndex(
    new THREE.BufferAttribute(new Uint32Array(allIndices), 1),
  );
  geo.computeVertexNormals();
  return { geometry: geo, faceScopes: allFaceScopes };
}

function pointInPolygonXZ(point: THREE.Vector3, polygon: [number, number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const zi = polygon[i][2];
    const xj = polygon[j][0];
    const zj = polygon[j][2];
    if ((zi > point.z) !== (zj > point.z) && point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function findRectAtPoint(rects: Rectangle3D[], point: THREE.Vector3) {
  return rects.find((rect) => {
    if (rect.polygonFootprint && rect.polygonFootprint.length >= 3) {
      return pointInPolygonXZ(point, rect.polygonFootprint);
    }
    const { localX, localZ } = getChimneyLocalPosition(rect, point.x, point.z);
    return Math.abs(localX) <= getRectWidth(rect) / 2 && Math.abs(localZ) <= rect.depth / 2;
  }) ?? rects[0];
}
