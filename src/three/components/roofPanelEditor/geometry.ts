import * as THREE from "three";
import {
  computeRoofSideFrame,
  type ManualPanel2D,
  type Obstacle2D,
} from "../../store/solarPanelStore";

let _panelIdCounter = 0;
export function nextPanelId() {
  return `mp_${++_panelIdCounter}_${Date.now()}`;
}

export function projectTo2D(
  vertices: number[],
  normal: [number, number, number],
) {
  const frame = computeRoofSideFrame(vertices, normal);
  const { centroid, right, forward } = frame;
  const numVerts = vertices.length / 3;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < numVerts; i++) {
    const rel = new THREE.Vector3(
      vertices[i * 3] - centroid.x,
      vertices[i * 3 + 1] - centroid.y,
      vertices[i * 3 + 2] - centroid.z,
    );

    pts.push({ x: rel.dot(right), y: rel.dot(forward) });
  }
  return pts;
}

export function pointInPolygonRayCast(
  px: number,
  py: number,
  outline: { x: number; y: number }[],
): boolean {
  if (outline.length < 3) return false;

  let inside = false;
  const n = outline.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = outline[i].x,
      yi = outline[i].y;
    const xj = outline[j].x,
      yj = outline[j].y;

    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

export function isPanelInsideRoof(
  cx: number,
  cy: number,
  w: number,
  h: number,
  outline: { x: number; y: number }[],
): boolean {
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw, y: cy - hh },
    { x: cx - hw, y: cy + hh },
    { x: cx + hw, y: cy + hh },
  ];
  return corners.every((c) => pointInPolygonRayCast(c.x, c.y, outline));
}

export function panelsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  const aLeft = ax - aw / 2;
  const aRight = ax + aw / 2;
  const aTop = ay - ah / 2;
  const aBottom = ay + ah / 2;

  const bLeft = bx - bw / 2;
  const bRight = bx + bw / 2;
  const bTop = by - bh / 2;
  const bBottom = by + bh / 2;

  if (aRight <= bLeft || bRight <= aLeft || aBottom <= bTop || bBottom <= aTop) {
    return false;
  }
  return true;
}

export function wouldOverlapAny(
  cx: number,
  cy: number,
  w: number,
  h: number,
  panels: ManualPanel2D[],
  excludeId?: string,
): boolean {
  for (const panel of panels) {
    if (panel.id === excludeId) continue;
    if (
      panelsOverlap(cx, cy, w, h, panel.x, panel.y, panel.width, panel.height)
    ) {
      return true;
    }
  }
  return false;
}

export function overlapsAnyObstacle(
  cx: number,
  cy: number,
  w: number,
  h: number,
  obstacles: Obstacle2D[],
  obstaclePolygons: { x: number; y: number }[][] = [],
): boolean {
  for (const obs of obstacles) {
    if (
      panelsOverlap(
        cx,
        cy,
        w,
        h,
        obs.centerX,
        obs.centerY,
        obs.halfWidth * 2,
        obs.halfDepth * 2,
      )
    ) {
      return true;
    }
  }

  const hw = w / 2;
  const hh = h / 2;
  const rectCorners = [
    { x: cx - hw, y: cy - hh },
    { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh },
    { x: cx - hw, y: cy + hh },
  ];

  const pointInRect = (px: number, py: number) =>
    px >= cx - hw && px <= cx + hw && py >= cy - hh && py <= cy + hh;

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

  for (const poly of obstaclePolygons) {
    if (poly.length < 3) continue;

    if (rectCorners.some((c) => pointInPolygonRayCast(c.x, c.y, poly)))
      return true;

    if (poly.some((p) => pointInRect(p.x, p.y))) return true;

    for (let i = 0; i < 4; i++) {
      const ra = rectCorners[i];
      const rb = rectCorners[(i + 1) % 4];
      for (let j = 0; j < poly.length; j++) {
        const pa = poly[j];
        const pb = poly[(j + 1) % poly.length];
        if (segmentsIntersect(ra, rb, pa, pb)) return true;
      }
    }
  }

  return false;
}

export function signedPolygonArea(poly: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

export function clipPolygonAgainstConvexPolygon(
  subject: { x: number; y: number }[],
  clipper: { x: number; y: number }[],
): { x: number; y: number }[] {
  if (subject.length < 3 || clipper.length < 3) return [];
  const eps = 1e-9;
  const isClipperCCW = signedPolygonArea(clipper) >= 0;

  const inside = (
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    return isClipperCCW ? cross >= -eps : cross <= eps;
  };

  const intersection = (
    s: { x: number; y: number },
    e: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const d1x = e.x - s.x;
    const d1y = e.y - s.y;
    const d2x = b.x - a.x;
    const d2y = b.y - a.y;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < eps) return e;
    const t = ((a.x - s.x) * d2y - (a.y - s.y) * d2x) / denom;
    return { x: s.x + t * d1x, y: s.y + t * d1y };
  };

  let output = subject.slice();
  for (let i = 0; i < clipper.length; i++) {
    const a = clipper[i];
    const b = clipper[(i + 1) % clipper.length];
    const input = output;
    output = [];
    if (input.length === 0) break;

    let s = input[input.length - 1];
    for (const e of input) {
      const eInside = inside(e, a, b);
      const sInside = inside(s, a, b);
      if (eInside) {
        if (!sInside) output.push(intersection(s, e, a, b));
        output.push(e);
      } else if (sInside) {
        output.push(intersection(s, e, a, b));
      }
      s = e;
    }
  }

  const deduped: { x: number; y: number }[] = [];
  for (const p of output) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 1e-7) {
      deduped.push(p);
    }
  }
  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= 1e-7) {
      deduped.pop();
    }
  }

  return deduped.length >= 3 ? deduped : [];
}

export function buildOrderedOutline(
  verts2D: { x: number; y: number }[],
  indices: number[],
): { x: number; y: number }[] {
  const precision = 1e6;
  const keyForPoint = (p: { x: number; y: number }) =>
    `${Math.round(p.x * precision)},${Math.round(p.y * precision)}`;

  const points = new Map<string, { x: number; y: number }>();
  const pointKey = (idx: number) => {
    const p = verts2D[idx];
    const key = keyForPoint(p);
    if (!points.has(key)) points.set(key, p);
    return key;
  };

  const edgeCounts = new Map<string, { a: string; b: string; count: number }>();
  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const edge = edgeCounts.get(key);
    if (edge) {
      edge.count += 1;
    } else {
      edgeCounts.set(key, { a, b, count: 1 });
    }
  };

  const numTris = indices.length / 3;
  for (let t = 0; t < numTris; t++) {
    const a = pointKey(indices[t * 3]);
    const b = pointKey(indices[t * 3 + 1]);
    const c = pointKey(indices[t * 3 + 2]);
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  const adj = new Map<string, Set<string>>();
  const boundaryEdges: [string, string][] = [];
  for (const edge of edgeCounts.values()) {
    if (edge.count !== 1) continue;
    boundaryEdges.push([edge.a, edge.b]);
    if (!adj.has(edge.a)) adj.set(edge.a, new Set());
    if (!adj.has(edge.b)) adj.set(edge.b, new Set());
    adj.get(edge.a)!.add(edge.b);
    adj.get(edge.b)!.add(edge.a);
  }

  if (boundaryEdges.length === 0) return [];

  const visitedEdges = new Set<string>();
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const loops: { x: number; y: number }[][] = [];

  for (const [startA, startB] of boundaryEdges) {
    if (visitedEdges.has(edgeKey(startA, startB))) continue;

    const loopKeys = [startA];
    let prev = startA;
    let current = startB;
    visitedEdges.add(edgeKey(startA, startB));

    while (current !== startA) {
      loopKeys.push(current);
      const neighbors = Array.from(adj.get(current) ?? []);
      const next = neighbors.find(
        (n) => n !== prev && !visitedEdges.has(edgeKey(current, n)),
      );
      if (!next) break;
      visitedEdges.add(edgeKey(current, next));
      prev = current;
      current = next;
    }

    if (current === startA && loopKeys.length >= 3) {
      loops.push(loopKeys.map((key) => points.get(key)!).filter(Boolean));
    }
  }

  if (loops.length === 0) return [];
  return loops.reduce((best, loop) =>
    Math.abs(signedPolygonArea(loop)) > Math.abs(signedPolygonArea(best))
      ? loop
      : best,
  );
}

export function clampPanelToRoof(
  cx: number,
  cy: number,
  w: number,
  h: number,
  outline: { x: number; y: number }[],
  bbox: { minX: number; maxX: number; minY: number; maxY: number },
  obstacles: Obstacle2D[] = [],
  obstaclePolygons: { x: number; y: number }[][] = [],
): { x: number; y: number } | null {
  const hw = w / 2;
  const hh = h / 2;

  const x = Math.max(bbox.minX + hw, Math.min(bbox.maxX - hw, cx));
  const y = Math.max(bbox.minY + hh, Math.min(bbox.maxY - hh, cy));

  if (
    isPanelInsideRoof(x, y, w, h, outline) &&
    !overlapsAnyObstacle(x, y, w, h, obstacles, obstaclePolygons)
  ) {
    return { x, y };
  }

  const step = Math.min(w, h) * 0.1;
  let bestDist = Infinity;
  let bestPos: { x: number; y: number } | null = null;
  for (let dx = -5; dx <= 5; dx++) {
    for (let dy = -5; dy <= 5; dy++) {
      const tx = x + dx * step;
      const ty = y + dy * step;
      if (
        isPanelInsideRoof(tx, ty, w, h, outline) &&
        !overlapsAnyObstacle(tx, ty, w, h, obstacles, obstaclePolygons)
      ) {
        const dist = (tx - cx) ** 2 + (ty - cy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = { x: tx, y: ty };
        }
      }
    }
  }
  return bestPos;
}
