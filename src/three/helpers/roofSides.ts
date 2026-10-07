import * as THREE from "three";

export interface RoofSides {
  faceToGroup: Map<number, number>;
  groupGeometries: THREE.BufferGeometry[];
}


export function computeRoofSides(
  geometry: THREE.BufferGeometry,
  minNormalY = -Infinity,
  faceScopes?: readonly (string | number | undefined)[],
): RoofSides {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  if (!index || !position) return { faceToGroup: new Map(), groupGeometries: [] };

  const faceCount = index.count / 3;
  const normals: THREE.Vector3[] = [];
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();


  for (let i = 0; i < faceCount; i++) {
    v0.fromBufferAttribute(position, index.getX(i * 3));
    v1.fromBufferAttribute(position, index.getX(i * 3 + 1));
    v2.fromBufferAttribute(position, index.getX(i * 3 + 2));
    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    normals.push(new THREE.Vector3().crossVectors(edge1, edge2).normalize());
  }


  const PRECISION = 1e4;
  const quantise = (val: number) => Math.round(val * PRECISION);


  const posKey = (vi: number): string => {
    const x = quantise(position.getX(vi));
    const y = quantise(position.getY(vi));
    const z = quantise(position.getZ(vi));
    return `${x},${y},${z}`;
  };


  const canonMap = new Map<string, number>();
  const canon = (vi: number): number => {
    const k = posKey(vi);
    if (!canonMap.has(k)) canonMap.set(k, vi);
    return canonMap.get(k)!;
  };


  const edgeToFaces = new Map<string, number[]>();
  const edgeKey = (a: number, b: number): string =>
    a < b ? `${a}:${b}` : `${b}:${a}`;

  for (let fi = 0; fi < faceCount; fi++) {
    const a = canon(index.getX(fi * 3));
    const b = canon(index.getX(fi * 3 + 1));
    const c = canon(index.getX(fi * 3 + 2));
    for (const ek of [edgeKey(a, b), edgeKey(b, c), edgeKey(a, c)]) {
      let list = edgeToFaces.get(ek);
      if (!list) {
        list = [];
        edgeToFaces.set(ek, list);
      }
      list.push(fi);
    }
  }


  const faceNeighbours: Set<number>[] = Array.from({ length: faceCount }, () => new Set());
  for (const faces of edgeToFaces.values()) {
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        faceNeighbours[faces[i]].add(faces[j]);
        faceNeighbours[faces[j]].add(faces[i]);
      }
    }
  }


  const groups: number[][] = [];
  const faceToGroup = new Map<number, number>();
  const assigned = new Set<number>();

  for (let i = 0; i < faceCount; i++) {
    if (assigned.has(i) || normals[i].y < minNormalY) continue;

    const group: number[] = [];
    const stack = [i];
    assigned.add(i);

    while (stack.length > 0) {
      const fi = stack.pop()!;
      group.push(fi);

      for (const nb of faceNeighbours[fi]) {
        if (assigned.has(nb) || normals[nb].y < minNormalY) continue;
        if (faceScopes && faceScopes[nb] !== faceScopes[i]) continue;

        if (normals[i].dot(normals[nb]) > 0.95) {
          assigned.add(nb);
          stack.push(nb);
        }
      }
    }

    const gIdx = groups.length;
    groups.push(group);
    for (const f of group) faceToGroup.set(f, gIdx);
  }


  const groupGeometries = groups.map((faces) => {
    const usedVerts = new Map<string, number>();
    const pos: number[] = [];
    const idx: number[] = [];
    let next = 0;
    for (const fi of faces) {
      for (let k = 0; k < 3; k++) {
        const origV = index.getX(fi * 3 + k);
        const key = posKey(origV);
        if (!usedVerts.has(key)) {
          usedVerts.set(key, next++);
          pos.push(
            position.getX(origV),
            position.getY(origV),
            position.getZ(origV),
          );
        }
        idx.push(usedVerts.get(key)!);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  });

  return { faceToGroup, groupGeometries };
}
