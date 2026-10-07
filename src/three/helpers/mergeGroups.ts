import type { Rectangle3D } from "../store/rectangleStore";


export function findMergeGroups(rects: Rectangle3D[]): Rectangle3D[][] {
  const visited = new Set<string>();
  const groups: Rectangle3D[][] = [];
  const rectMap = new Map(rects.map((r) => [r.id, r]));


  const neighbors = new Map<string, Set<string>>();
  for (const r of rects) {
    if (!neighbors.has(r.id)) neighbors.set(r.id, new Set());
    for (const merge of [r.mergeStart, r.mergeEnd]) {
      if (!merge) continue;
      neighbors.get(r.id)!.add(merge.rectId);
      if (!neighbors.has(merge.rectId)) neighbors.set(merge.rectId, new Set());
      neighbors.get(merge.rectId)!.add(r.id);
    }
  }

  for (const rect of rects) {
    if (visited.has(rect.id)) continue;


    const group: Rectangle3D[] = [];
    const queue = [rect.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const r = rectMap.get(id);
      if (!r) continue;
      group.push(r);

      const adj = neighbors.get(id);
      if (adj) {
        for (const neighborId of adj) {
          if (!visited.has(neighborId)) queue.push(neighborId);
        }
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}


export function getMergedRectIds(groups: Rectangle3D[][]): Set<string> {
  const ids = new Set<string>();
  for (const group of groups) {
    for (const rect of group) {
      ids.add(rect.id);
    }
  }
  return ids;
}
