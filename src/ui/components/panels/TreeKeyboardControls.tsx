import { useEffect } from "react";
import { useAtomValue, useSetAtom, useAtom } from "jotai";
import {
  trees3DAtom,
  selectedTreeIdAtom,
  selectedTreeAtom,
  lastTreeDimensionsAtom,
} from "../../../three/store/rectangleStore";
import { metersPerUnitAtom } from "../../../store/atoms";

const SCALE_STEP = 1.05;
const MIN_RADIUS_M = 0.1;
const MAX_RADIUS_M = 50;
const MIN_HEIGHT_M = 0.2;
const MAX_HEIGHT_M = 100;

export function TreeKeyboardControls() {
  const selectedTree = useAtomValue(selectedTreeAtom);
  const setTrees = useSetAtom(trees3DAtom);
  const [selectedId, setSelectedId] = useAtom(selectedTreeIdAtom);
  const setLastDims = useSetAtom(lastTreeDimensionsAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);

  useEffect(() => {
    if (!selectedId || !selectedTree) return;

    const handleKeyDown = (e: KeyboardEvent) => {

        const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setTrees((prev) => prev.filter((t) => t.id !== selectedId));
        setSelectedId(null);
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }

      const isScaleUp = e.key === "+" || e.key === "=";
      const isScaleDown = e.key === "-" || e.key === "_";
      if (!isScaleUp && !isScaleDown) return;

      e.preventDefault();
      const factor = isScaleUp ? SCALE_STEP : 1 / SCALE_STEP;

      const newRadiusUnits = selectedTree.radius * factor;
      const newHeightUnits = selectedTree.height * factor;
      const newRadiusM = newRadiusUnits * metersPerUnit;
      const newHeightM = newHeightUnits * metersPerUnit;

      if (
        newRadiusM < MIN_RADIUS_M ||
        newRadiusM > MAX_RADIUS_M ||
        newHeightM < MIN_HEIGHT_M ||
        newHeightM > MAX_HEIGHT_M
      ) {
        return;
      }

      setTrees((prev) =>
        prev.map((t) =>
          t.id === selectedId
            ? { ...t, radius: newRadiusUnits, height: newHeightUnits }
            : t,
        ),
      );
      setLastDims({ canopyRadius: newRadiusM, height: newHeightM });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedId,
    selectedTree,
    setTrees,
    setSelectedId,
    setLastDims,
    metersPerUnit,
  ]);

  return null;
}
