import { type ThreeEvent } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Rectangle3D } from "../../store/rectangleStore";

export interface DragState {
  type: "rect" | "handle" | "width" | "rotate";
  rectId: string;
  handle?: "start" | "end";
  widthSide?: "left" | "right";
  offset?: Vector3;
}

export function rayToGroundPoint(e: ThreeEvent<PointerEvent>): Vector3 {
  const { ray } = e;
  if (Math.abs(ray.direction.y) < 1e-6) return e.point.clone().setY(0);
  const t = -ray.origin.y / ray.direction.y;
  if (!Number.isFinite(t)) return e.point.clone().setY(0);
  return new Vector3(
    ray.origin.x + t * ray.direction.x,
    0,
    ray.origin.z + t * ray.direction.z,
  );
}

export function roofSideKeyIncludesRectId(
  roofSideKey: string,
  rectIds: Set<string>,
) {
  const groupId = roofSideKey.split(":")[0];
  return groupId.split("+").some((id) => rectIds.has(id));
}

export function getShedHighDir(
  rect: Rectangle3D,
): { x: number; z: number } | null {
  const dx = rect.end[0] - rect.start[0];
  const dz = rect.end[2] - rect.start[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return null;
  const nx = dx / len;
  const nz = dz / len;
  const sign = (rect.shedDirection ?? "left") === "left" ? 1 : -1;
  return { x: -nz * sign, z: nx * sign };
}

export function alignShedToWorldDir(
  rect: Rectangle3D,
  target: { x: number; z: number },
): "left" | "right" {
  const dx = rect.end[0] - rect.start[0];
  const dz = rect.end[2] - rect.start[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return rect.shedDirection ?? "left";
  const nx = dx / len;
  const nz = dz / len;
  const dot = -nz * target.x + nx * target.z;
  return dot >= 0 ? "left" : "right";
}

export function getAlignedShedDirection(
  draggedRect: Rectangle3D | undefined,
  targetRect: Rectangle3D | undefined,
): "left" | "right" | undefined {
  if (
    !draggedRect ||
    !targetRect ||
    (targetRect.roofType ?? "hip") !== "shed" ||
    (draggedRect.roofType ?? "hip") !== "shed"
  ) {
    return undefined;
  }
  const targetDir = getShedHighDir(targetRect);
  return targetDir ? alignShedToWorldDir(draggedRect, targetDir) : undefined;
}
