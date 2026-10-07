import * as THREE from "three";
import type { Chimney3D, Rectangle3D } from "./rectangleStore";
import { getChimneyWorldPosition } from "./rectangleStore";
import { computeRectCorners } from "../helpers/modelCreation";
import type {
  Obstacle2D,
  SolarPanelInstance,
  ManualPanel2D,
} from "./solarPanelStore";

export const PANEL_HALF_THICKNESS = 0.006;

export function isPointInTriangle2D(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const dX = px - cx;
  const dY = py - cy;
  const dX21 = cx - bx;
  const dY12 = by - cy;
  const D = dY12 * (ax - cx) + dX21 * (ay - cy);
  const s = dY12 * dX + dX21 * dY;
  const t = (cy - ay) * dX + (ax - cx) * dY;
  if (D < 0) return s <= 0 && t <= 0 && s + t >= D;
  return s >= 0 && t >= 0 && s + t <= D;
}

function rectanglesOverlap(
  ax: number,
  ay: number,
  aHalfW: number,
  aHalfH: number,
  bx: number,
  by: number,
  bHalfW: number,
  bHalfH: number,
  margin: number = 0.02,
): boolean {
  const overlapX = Math.abs(ax - bx) < aHalfW + bHalfW + margin;
  const overlapY = Math.abs(ay - by) < aHalfH + bHalfH + margin;
  return overlapX && overlapY;
}

function rectangleOverlapsPolygon(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  polygon: { x: number; y: number }[],
  margin: number = 0.02,
): boolean {
  if (polygon.length < 3) return false;

  const rectCorners = [
    { x: cx - halfW - margin, y: cy - halfH - margin },
    { x: cx + halfW + margin, y: cy - halfH - margin },
    { x: cx + halfW + margin, y: cy + halfH + margin },
    { x: cx - halfW - margin, y: cy + halfH + margin },
  ];

  const pointInRect = (px: number, py: number) =>
    px >= cx - halfW - margin &&
    px <= cx + halfW + margin &&
    py >= cy - halfH - margin &&
    py <= cy + halfH + margin;

  const pointInPolygon = (px: number, py: number) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };

  const orient = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const onSegment = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    p: { x: number; y: number },
  ) =>
    Math.min(a.x, b.x) - 1e-8 <= p.x &&
    p.x <= Math.max(a.x, b.x) + 1e-8 &&
    Math.min(a.y, b.y) - 1e-8 <= p.y &&
    p.y <= Math.max(a.y, b.y) + 1e-8;

  const segmentsIntersect = (
    a1: { x: number; y: number },
    a2: { x: number; y: number },
    b1: { x: number; y: number },
    b2: { x: number; y: number },
  ) => {
    const o1 = orient(a1, a2, b1);
    const o2 = orient(a1, a2, b2);
    const o3 = orient(b1, b2, a1);
    const o4 = orient(b1, b2, a2);
    if (o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0) return true;
    if (Math.abs(o1) < 1e-8 && onSegment(a1, a2, b1)) return true;
    if (Math.abs(o2) < 1e-8 && onSegment(a1, a2, b2)) return true;
    if (Math.abs(o3) < 1e-8 && onSegment(b1, b2, a1)) return true;
    if (Math.abs(o4) < 1e-8 && onSegment(b1, b2, a2)) return true;
    return false;
  };

  if (rectCorners.some((p) => pointInPolygon(p.x, p.y))) return true;
  if (polygon.some((p) => pointInRect(p.x, p.y))) return true;

  for (let i = 0; i < rectCorners.length; i++) {
    const ra = rectCorners[i];
    const rb = rectCorners[(i + 1) % rectCorners.length];
    for (let j = 0; j < polygon.length; j++) {
      const pa = polygon[j];
      const pb = polygon[(j + 1) % polygon.length];
      if (segmentsIntersect(ra, rb, pa, pb)) return true;
    }
  }

  return false;
}

export function computeRoofSideFrame(
  vertices: number[],
  normal: [number, number, number],
) {
  const N = new THREE.Vector3(...normal).normalize();

  let worldUp = new THREE.Vector3(0, 1, 0);
  if (Math.abs(N.dot(worldUp)) > 0.99) {
    worldUp = new THREE.Vector3(1, 0, 0);
  }

  const right = new THREE.Vector3().crossVectors(worldUp, N).normalize();
  const forward = new THREE.Vector3().crossVectors(N, right).normalize();

  const numVerts = vertices.length / 3;
  const centroid = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < numVerts; i++) {
    centroid.x += vertices[i * 3];
    centroid.y += vertices[i * 3 + 1];
    centroid.z += vertices[i * 3 + 2];
  }
  centroid.divideScalar(numVerts);

  return { centroid, right, forward, normal: N };
}

export function chimneysToObstacles(
  chimneys: Chimney3D[],
  rect: Rectangle3D,
  vertices: number[],
  normal: [number, number, number],
): Obstacle2D[] {
  const frame = computeRoofSideFrame(vertices, normal);
  const { centroid, right, forward, normal: N } = frame;

  const roofChimneys = chimneys.filter((c) => c.rectangleId === rect.id);

  return roofChimneys.map((chimney) => {
    const [worldX, , worldZ] = getChimneyWorldPosition(rect, chimney);

    const dx = worldX - centroid.x;
    const dz = worldZ - centroid.z;
    let dy = 0;
    if (Math.abs(N.y) > 1e-6) {
      dy = -(dx * N.x + dz * N.z) / N.y;
    }

    const centerX = dx * right.x + dy * right.y + dz * right.z;
    const centerY = dx * forward.x + dy * forward.y + dz * forward.z;

    const halfWidth = Math.max(chimney.width, chimney.depth) / 2;
    const halfDepth = Math.max(chimney.width, chimney.depth) / 2;

    return {
      centerX,
      centerY,
      halfWidth,
      halfDepth,
    };
  });
}

export function neighborRoofObstacles(
  rects: Rectangle3D[],
  vertices: number[],
  normal: [number, number, number],
): Obstacle2D[] {
  if (rects.length < 2) return [];
  const frame = computeRoofSideFrame(vertices, normal);
  const { centroid, right, forward, normal: N } = frame;

  const rectFootprints = rects.map((r) => ({
    rect: r,
    corners: computeRectCorners(r, rects),
  }));

  const isPointInQuad = (
    px: number,
    pz: number,
    q: {
      sr: THREE.Vector2;
      sl: THREE.Vector2;
      el: THREE.Vector2;
      er: THREE.Vector2;
    },
  ): boolean => {
    const ax = isPointInTriangle2D(
      px,
      pz,
      q.sr.x,
      q.sr.y,
      q.sl.x,
      q.sl.y,
      q.el.x,
      q.el.y,
    );
    const bx = isPointInTriangle2D(
      px,
      pz,
      q.sr.x,
      q.sr.y,
      q.el.x,
      q.el.y,
      q.er.x,
      q.er.y,
    );
    return ax || bx;
  };

  const ownerIdx = rectFootprints.findIndex(({ corners }) =>
    isPointInQuad(centroid.x, centroid.z, corners),
  );

  const obstacles: Obstacle2D[] = [];

  for (let i = 0; i < rectFootprints.length; i++) {
    if (i === ownerIdx) continue;
    const { corners } = rectFootprints[i];
    const cornerList = [corners.sr, corners.sl, corners.el, corners.er];

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const c of cornerList) {
      const dx = c.x - centroid.x;
      const dz = c.y - centroid.z;
      let dy = 0;
      if (Math.abs(N.y) > 1e-6) {
        dy = -(dx * N.x + dz * N.z) / N.y;
      }
      const localX = dx * right.x + dy * right.y + dz * right.z;
      const localY = dx * forward.x + dy * forward.y + dz * forward.z;
      minX = Math.min(minX, localX);
      maxX = Math.max(maxX, localX);
      minY = Math.min(minY, localY);
      maxY = Math.max(maxY, localY);
    }

    obstacles.push({
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      halfWidth: (maxX - minX) / 2,
      halfDepth: (maxY - minY) / 2,
    });
  }

  return obstacles;
}

export function neighborRoofObstaclePolygons(
  rects: Rectangle3D[],
  vertices: number[],
  normal: [number, number, number],
  ownerRectIdOverride?: string,
  selectedIndices?: number[],
): { x: number; y: number }[][] {
  if (rects.length < 2) return [];
  const frame = computeRoofSideFrame(vertices, normal);
  const { centroid, right, forward, normal: N } = frame;

  const rectFootprints = rects.map((r) => ({
    rect: r,
    corners: computeRectCorners(r, rects),
  }));

  const isPointInQuad = (
    px: number,
    pz: number,
    q: {
      sr: THREE.Vector2;
      sl: THREE.Vector2;
      el: THREE.Vector2;
      er: THREE.Vector2;
    },
  ): boolean => {
    const ax = isPointInTriangle2D(
      px,
      pz,
      q.sr.x,
      q.sr.y,
      q.sl.x,
      q.sl.y,
      q.el.x,
      q.el.y,
    );
    const bx = isPointInTriangle2D(
      px,
      pz,
      q.sr.x,
      q.sr.y,
      q.el.x,
      q.el.y,
      q.er.x,
      q.er.y,
    );
    return ax || bx;
  };

  const inferOwnerIdxFromSelectedTriangles = () => {
    if (!selectedIndices || selectedIndices.length < 3) return -1;

    const scores = new Array(rectFootprints.length).fill(0);
    for (let t = 0; t < selectedIndices.length; t += 3) {
      const ia = selectedIndices[t] * 3;
      const ib = selectedIndices[t + 1] * 3;
      const ic = selectedIndices[t + 2] * 3;
      if (ic + 2 >= vertices.length) continue;

      const ax = vertices[ia];
      const az = vertices[ia + 2];
      const bx = vertices[ib];
      const bz = vertices[ib + 2];
      const cx = vertices[ic];
      const cz = vertices[ic + 2];
      const area = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) / 2;
      if (area <= 1e-8) continue;

      const centerX = (ax + bx + cx) / 3;
      const centerZ = (az + bz + cz) / 3;
      rectFootprints.forEach(({ corners }, idx) => {
        if (isPointInQuad(centerX, centerZ, corners)) scores[idx] += area;
      });
    }

    let bestIdx = -1;
    let bestScore = 0;
    scores.forEach((score, idx) => {
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    return bestIdx;
  };

  const ownerIdxFromOverride = ownerRectIdOverride
    ? rectFootprints.findIndex(({ rect }) => rect.id === ownerRectIdOverride)
    : -1;
  const ownerIdxFromGeometry = inferOwnerIdxFromSelectedTriangles();
  const ownerIdx =
    ownerIdxFromOverride >= 0
      ? ownerIdxFromOverride
      : ownerIdxFromGeometry >= 0
        ? ownerIdxFromGeometry
        : rectFootprints.findIndex(({ corners }) =>
            isPointInQuad(centroid.x, centroid.z, corners),
          );

  const groupRidgeH = Math.max(
    ...rects.map(
      (r) => (r.wallHeight ?? 0.8) + (r.depth / 2) * (r.pitchAngle ?? 0.5),
    ),
  );

  const roofTrianglesForRect = (rect: Rectangle3D): THREE.Vector3[][] => {
    const corners = computeRectCorners(rect, rects);
    const { sr, sl, el, er, startCenter, endCenter } = corners;
    const startMerged = !!rect.mergeStart;
    const endMerged = !!rect.mergeEnd;
    const wallHeight = rect.wallHeight ?? 0.8;
    const halfD = rect.depth / 2;
    const roofType = rect.roofType ?? "hip";
    const shedDirection = rect.shedDirection ?? "left";
    const highY = wallHeight + halfD * (rect.pitchAngle ?? 0.5);
    const isShed = roofType === "shed";

    const srTop = new THREE.Vector3(
      sr.x,
      isShed && shedDirection === "right" ? highY : wallHeight,
      sr.y,
    );
    const slTop = new THREE.Vector3(
      sl.x,
      isShed && shedDirection === "left" ? highY : wallHeight,
      sl.y,
    );
    const elTop = new THREE.Vector3(
      el.x,
      isShed && shedDirection === "left" ? highY : wallHeight,
      el.y,
    );
    const erTop = new THREE.Vector3(
      er.x,
      isShed && shedDirection === "right" ? highY : wallHeight,
      er.y,
    );

    if (roofType === "flat") {
      const flatY = wallHeight + 0.02;
      return [
        [
          new THREE.Vector3(sr.x, flatY, sr.y),
          new THREE.Vector3(er.x, flatY, er.y),
          new THREE.Vector3(el.x, flatY, el.y),
        ],
        [
          new THREE.Vector3(sr.x, flatY, sr.y),
          new THREE.Vector3(el.x, flatY, el.y),
          new THREE.Vector3(sl.x, flatY, sl.y),
        ],
      ];
    }

    if (roofType === "shed") {
      return [
        [srTop, slTop, elTop],
        [srTop, elTop, erTop],
      ];
    }

    const s = new THREE.Vector2(startCenter.x, startCenter.y);
    const e = new THREE.Vector2(endCenter.x, endCenter.y);
    const ridgeDir = e.clone().sub(s);
    const ridgeLen = ridgeDir.length();
    const hipInset = rect.depth * 0.3;
    const startInset = startMerged ? 0 : hipInset;
    const endInset = endMerged ? 0 : hipInset;

    if (ridgeLen <= startInset + endInset) {
      const peak = new THREE.Vector3(
        (sr.x + sl.x + er.x + el.x) / 4,
        groupRidgeH,
        (sr.y + sl.y + er.y + el.y) / 4,
      );
      return [
        [srTop, slTop, peak],
        [slTop, elTop, peak],
        [elTop, erTop, peak],
        [erTop, srTop, peak],
      ];
    }

    ridgeDir.normalize();
    const ridgeStart = s
      .clone()
      .add(ridgeDir.clone().multiplyScalar(startInset));
    const ridgeEnd = e.clone().sub(ridgeDir.clone().multiplyScalar(endInset));
    const rs = new THREE.Vector3(ridgeStart.x, groupRidgeH, ridgeStart.y);
    const re = new THREE.Vector3(ridgeEnd.x, groupRidgeH, ridgeEnd.y);

    const triangles = [
      [slTop, elTop, re],
      [slTop, re, rs],
      [srTop, rs, re],
      [srTop, re, erTop],
    ];
    if (!startMerged) triangles.push([srTop, slTop, rs]);
    if (!endMerged) triangles.push([elTop, erTop, re]);
    return triangles;
  };

  const midpointMergeTriangleForRect = (
    rect: Rectangle3D,
    ownerRectId: string | undefined,
  ): THREE.Vector3[] | null => {
    const mergeStartToOwner =
      rect.mergeStart?.handle === "midpoint" &&
      rect.mergeStart.rectId === ownerRectId;
    const mergeEndToOwner =
      rect.mergeEnd?.handle === "midpoint" &&
      rect.mergeEnd.rectId === ownerRectId;

    if (!mergeStartToOwner && !mergeEndToOwner) return null;

    const corners = computeRectCorners(rect, rects);
    const a = mergeStartToOwner ? corners.sr : corners.er;
    const b = mergeStartToOwner ? corners.sl : corners.el;
    const apex = mergeStartToOwner ? corners.startCenter : corners.endCenter;

    return [
      new THREE.Vector3(a.x, 0, a.y),
      new THREE.Vector3(b.x, 0, b.y),
      new THREE.Vector3(apex.x, 0, apex.y),
    ];
  };

  const selectedPlanePoint = new THREE.Vector3(
    vertices[0] ?? 0,
    vertices[1] ?? 0,
    vertices[2] ?? 0,
  );

  const projectPointToSelectedPlane = (point: THREE.Vector3) => {
    const projected = point.clone();
    if (Math.abs(N.y) > 1e-6) {
      projected.y =
        selectedPlanePoint.y -
        (N.x * (projected.x - selectedPlanePoint.x) +
          N.z * (projected.z - selectedPlanePoint.z)) /
          N.y;
    }
    const rel = projected.sub(centroid);
    return { x: rel.dot(right), y: rel.dot(forward) };
  };

  const polygons: { x: number; y: number }[][] = [];
  const ownerRectId =
    ownerIdx >= 0 ? rectFootprints[ownerIdx].rect.id : undefined;
  const hasMidpointMerges = rects.some(
    (rect) =>
      rect.mergeStart?.handle === "midpoint" ||
      rect.mergeEnd?.handle === "midpoint",
  );

  for (let i = 0; i < rectFootprints.length; i++) {
    if (i === ownerIdx) continue;
    const { rect } = rectFootprints[i];
    const midpointTriangle = midpointMergeTriangleForRect(rect, ownerRectId);
    if (midpointTriangle) {
      const projected = midpointTriangle.map(projectPointToSelectedPlane);
      const area = Math.abs(
        (projected[0].x * (projected[1].y - projected[2].y) +
          projected[1].x * (projected[2].y - projected[0].y) +
          projected[2].x * (projected[0].y - projected[1].y)) /
          2,
      );
      if (area > 1e-6) polygons.push(projected);
      continue;
    }

    if (hasMidpointMerges) continue;

    for (const tri of roofTrianglesForRect(rect)) {
      const projected = tri.map(projectPointToSelectedPlane);
      const area = Math.abs(
        (projected[0].x * (projected[1].y - projected[2].y) +
          projected[1].x * (projected[2].y - projected[0].y) +
          projected[2].x * (projected[0].y - projected[1].y)) /
          2,
      );
      if (area > 1e-6) polygons.push(projected);
    }
  }

  return polygons;
}

const AXIS_EPSILON = 1e-8;

function createPanelAxisCandidates(
  min: number,
  max: number,
  itemSize: number,
  step: number,
  preferredMargin: number,
): number[] {
  const extent = max - min;
  if (
    !Number.isFinite(extent) ||
    !Number.isFinite(itemSize) ||
    !Number.isFinite(step) ||
    itemSize <= 0 ||
    extent + AXIS_EPSILON < itemSize
  ) {
    return [];
  }

  const maxMargin = Math.max(0, (extent - itemSize) / 2);
  const margin = Math.min(Math.max(0, preferredMargin), maxMargin);
  const start = min + margin + itemSize / 2;
  const end = max - margin - itemSize / 2;
  const safeStep = Math.max(step, itemSize, AXIS_EPSILON);
  const count = Math.max(
    1,
    Math.floor((end - start) / safeStep + AXIS_EPSILON) + 1,
  );

  return Array.from({ length: count }, (_, idx) => start + idx * safeStep);
}

export function generatePanelsForRoofSide(
  vertices: number[],
  indices: number[],
  normal: [number, number, number],
  panelWidth: number,
  panelHeight: number,
  gap: number = 0.03,
  obstacles: Obstacle2D[] = [],
  rotationAngle: number = 0,
  rowSpacing?: number,
  standHeight: number = 0,
  inclinationAngle: number = 0,
  obstaclePolygons: { x: number; y: number }[][] = [],
): SolarPanelInstance[] {
  const frame = computeRoofSideFrame(vertices, normal);
  const { centroid, right, forward, normal: N } = frame;

  const cosA = Math.cos(rotationAngle);
  const sinA = Math.sin(rotationAngle);
  const rRight = right
    .clone()
    .multiplyScalar(cosA)
    .add(forward.clone().multiplyScalar(sinA));
  const rForward = right
    .clone()
    .multiplyScalar(-sinA)
    .add(forward.clone().multiplyScalar(cosA));

  const cosT = Math.cos(inclinationAngle);
  const sinT = Math.sin(inclinationAngle);
  const tiltedUp = rForward
    .clone()
    .multiplyScalar(cosT)
    .add(N.clone().multiplyScalar(sinT));
  const tiltedNormal = rForward
    .clone()
    .multiplyScalar(-sinT)
    .add(N.clone().multiplyScalar(cosT));

  const numVerts = vertices.length / 3;
  const verts2D: { x: number; y: number }[] = [];
  for (let i = 0; i < numVerts; i++) {
    const rel = new THREE.Vector3(
      vertices[i * 3] - centroid.x,
      vertices[i * 3 + 1] - centroid.y,
      vertices[i * 3 + 2] - centroid.z,
    );
    verts2D.push({
      x: rel.dot(rRight),
      y: rel.dot(rForward),
    });
  }

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

  const numTris = indices.length / 3;
  const columnSpacing = Math.max(0, gap);
  const effectiveRowSpacing = Math.max(0, rowSpacing ?? columnSpacing);
  const cellW = panelWidth + columnSpacing;

  const projectedHeight = Math.max(panelHeight * Math.abs(cosT), 0.01);
  const cellH = projectedHeight + effectiveRowSpacing;
  const halfW = panelWidth / 2;
  const halfH = panelHeight / 2;
  const halfFootprintH = projectedHeight / 2;
  const xCandidates = createPanelAxisCandidates(
    minX,
    maxX,
    panelWidth,
    cellW,
    columnSpacing * 2,
  );
  const yCandidates = createPanelAxisCandidates(
    minY,
    maxY,
    projectedHeight,
    cellH,
    effectiveRowSpacing * 2,
  );

  const panels: SolarPanelInstance[] = [];

  for (const x of xCandidates) {
    for (const y of yCandidates) {
      const corners = [
        { x: x - halfW, y: y - halfFootprintH },
        { x: x + halfW, y: y - halfFootprintH },
        { x: x - halfW, y: y + halfFootprintH },
        { x: x + halfW, y: y + halfFootprintH },
      ];

      const allInside = corners.every((c) => {
        for (let t = 0; t < numTris; t++) {
          const a = verts2D[indices[t * 3]];
          const b = verts2D[indices[t * 3 + 1]];
          const c2 = verts2D[indices[t * 3 + 2]];
          if (isPointInTriangle2D(c.x, c.y, a.x, a.y, b.x, b.y, c2.x, c2.y)) {
            return true;
          }
        }
        return false;
      });

      const obsX = x * cosA - y * sinA;
      const obsY = x * sinA + y * cosA;
      const overlapsObstacle =
        obstacles.some((obs) =>
          rectanglesOverlap(
            obsX,
            obsY,
            halfW,
            halfFootprintH,
            obs.centerX,
            obs.centerY,
            obs.halfWidth,
            obs.halfDepth,
          ),
        ) ||
        obstaclePolygons.some((poly) =>
          rectangleOverlapsPolygon(obsX, obsY, halfW, halfFootprintH, poly),
        );

      if (allInside && !overlapsObstacle) {
        const liftY =
          PANEL_HALF_THICKNESS + 0.01 + standHeight + halfH * Math.abs(sinT);
        const pos3D = centroid
          .clone()
          .add(rRight.clone().multiplyScalar(x))
          .add(rForward.clone().multiplyScalar(y))
          .add(N.clone().multiplyScalar(liftY));

        panels.push({
          position: [pos3D.x, pos3D.y, pos3D.z],
          normal: [tiltedNormal.x, tiltedNormal.y, tiltedNormal.z],
          right: [rRight.x, rRight.y, rRight.z],
          up: [tiltedUp.x, tiltedUp.y, tiltedUp.z],
        });
      }
    }
  }

  return panels;
}

export function manualPanelsToInstances(
  manualPanels: ManualPanel2D[],
  vertices: number[],
  normal: [number, number, number],
  standHeight: number = 0,
  inclinationAngle: number = 0,
): SolarPanelInstance[] {
  const frame = computeRoofSideFrame(vertices, normal);
  const { centroid, right, forward, normal: N } = frame;
  const cosT = Math.cos(inclinationAngle);
  const sinT = Math.sin(inclinationAngle);

  return manualPanels.map((mp) => {
    const rot = mp.rotation ?? 0;
    const cosA = Math.cos(rot);
    const sinA = Math.sin(rot);
    const pRight = right
      .clone()
      .multiplyScalar(cosA)
      .add(forward.clone().multiplyScalar(sinA));
    const pForward = right
      .clone()
      .multiplyScalar(-sinA)
      .add(forward.clone().multiplyScalar(cosA));

    const tiltedUp = pForward
      .clone()
      .multiplyScalar(cosT)
      .add(N.clone().multiplyScalar(sinT));
    const tiltedNormal = pForward
      .clone()
      .multiplyScalar(-sinT)
      .add(N.clone().multiplyScalar(cosT));

    const liftY =
      PANEL_HALF_THICKNESS +
      0.01 +
      standHeight +
      (mp.height / 2) * Math.abs(sinT);

    const pos3D = centroid
      .clone()
      .add(right.clone().multiplyScalar(mp.x))
      .add(forward.clone().multiplyScalar(mp.y))
      .add(N.clone().multiplyScalar(liftY));

    return {
      position: [pos3D.x, pos3D.y, pos3D.z],
      normal: [tiltedNormal.x, tiltedNormal.y, tiltedNormal.z],
      right: [pRight.x, pRight.y, pRight.z],
      up: [tiltedUp.x, tiltedUp.y, tiltedUp.z],
    };
  });
}
