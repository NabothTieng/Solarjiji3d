import { useControls, button } from "leva";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  interactionModeAtom,
  isDrawingActiveAtom,
  rectanglesAtom,
  selectedRectangleIdAtom,
  selectedRectangleAtom,
  getRectRotation,
  getRectCenter,
  getRectWidth,
  activeToolAtom,
  type InteractionMode,
} from "../store/rectangleStore";
import { radiansToDegrees, degreesToRadians } from "../../utils/helpers";

export const DrawingController = () => {
  const setMode = useSetAtom(interactionModeAtom);
  const setActiveTool = useSetAtom(activeToolAtom);
  const setIsDrawingActive = useSetAtom(isDrawingActiveAtom);
  const [, setRectangles] = useAtom(rectanglesAtom);
  const selectedId = useAtomValue(selectedRectangleIdAtom);
  const selectedRect = useAtomValue(selectedRectangleAtom);


  const selectedIdRef = useRef(selectedId);
  const setRectanglesRef = useRef(setRectangles);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    setRectanglesRef.current = setRectangles;
  }, [setRectangles]);


  const setLevaControlsRef = useRef<
    ((values: Record<string, unknown>) => void) | null
  >(null);
  const setLevaTransformRef = useRef<
    ((values: Record<string, unknown>) => void) | null
  >(null);


  const [startDrawCount, setStartDrawCount] = useState(0);
  const [stopDrawCount, setStopDrawCount] = useState(0);


  const [{ mode }, setLevaControls] = useControls("Controls", () => ({
    mode: {
      value: "select",
      options: { Select: "select", Draw: "draw", Drag: "drag" },
    },
    "Start Draw": button(() => setStartDrawCount((c) => c + 1)),
    "Stop Draw": button(() => setStopDrawCount((c) => c + 1)),
  }));

  useEffect(() => {
    setLevaControlsRef.current = setLevaControls;
  }, [setLevaControls]);


  useEffect(() => {
    if (startDrawCount > 0) {
      setLevaControlsRef.current?.({ mode: "draw" });
    }
  }, [startDrawCount]);

  useEffect(() => {
    if (stopDrawCount > 0) {
      setLevaControlsRef.current?.({ mode: "select" });
    }
  }, [stopDrawCount]);


  useEffect(() => {
    setMode(mode as InteractionMode);
    setIsDrawingActive(mode === "draw");
  }, [mode, setMode, setIsDrawingActive]);


  const [{ rotation }, setLevaTransform] = useControls("Transform", () => ({
    rotation: {
      value: 0,
      min: -180,
      max: 180,
      step: 1,
      label: "Rotation (°)",
    },
  }));

  useEffect(() => {
    setLevaTransformRef.current = setLevaTransform;
  }, [setLevaTransform]);


  const isExternalRotationUpdate = useRef(false);


  useEffect(() => {
    if (isExternalRotationUpdate.current) {
      isExternalRotationUpdate.current = false;
      return;
    }
    const id = selectedIdRef.current;
    if (id) {
      setRectanglesRef.current((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const center = getRectCenter(r);
          const halfW = getRectWidth(r) / 2;
          const rad = degreesToRadians(rotation);
          return {
            ...r,
            start: [
              center[0] - halfW * Math.cos(rad),
              0,
              center[2] + halfW * Math.sin(rad),
            ] as [number, number, number],
            end: [
              center[0] + halfW * Math.cos(rad),
              0,
              center[2] - halfW * Math.sin(rad),
            ] as [number, number, number],
          };
        }),
      );
    }
  }, [rotation]);


  const selectedRotation = selectedRect ? getRectRotation(selectedRect) : 0;


  useEffect(() => {
    isExternalRotationUpdate.current = true;
    setLevaTransformRef.current?.({
      rotation: Math.round(radiansToDegrees(selectedRotation)),
    });
  }, [selectedId, selectedRotation]);


  useEffect(() => {
    document.body.style.cursor =
      mode === "draw" ? "crosshair" : mode === "drag" ? "grab" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [mode]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "d" || e.key === "D") {
        setLevaControlsRef.current?.({
          mode: "draw",
        });
        setActiveTool("hip");
      }
      if (e.key === "s" || e.key === "S") {
        setLevaControlsRef.current?.({
          mode: "select",
        });
        setActiveTool("select");
      }
      if (e.key === "Escape") {
        setLevaControlsRef.current?.({ mode: "select" });
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool]);

  return null;
};
