import type { RectangleGroupProps } from "../../../types";
import { useRoofGeometry } from "./hooks/useRoofGeometry";
import { useRoofLines } from "./hooks/useRoofLines";
import { useHandlePositions } from "./hooks/useHandlePositions";
import { getRectangleControlY } from "../../helpers/modelCreation";
import RoofBody from "./components/RoofBody";
import RoofLines from "./components/RoofLines";
import DragHandles from "./components/DragHandles";
import WidthHandles from "./components/WidthHandles";
import RotateHandle from "./components/RotateHandle";
import CapToggles from "./components/CapToggles";
import BreakConnectionButtons from "./components/BreakConnectionButtons";

const RectangleGroup = ({
  rect,
  allRects,
  isSelected,
  onRectPointerDown,
  onHandlePointerDown,
  onWidthHandlePointerDown,
  onToggleCap,
  onRotateHandlePointerDown,
  onBreakConnection,
  controlsOnly = false,
  controlsOnRoof = false,
  showMergeHandles = false,
}: RectangleGroupProps) => {
  const isPolygonFootprint = !!rect.polygonFootprint && rect.polygonFootprint.length >= 3;
  const { corners, geometry, startPt, endPt, outlinePoints, roofType, shedDirection } =
    useRoofGeometry(rect, allRects);

  const { ridgePoints, hipLines, gambrelLines, shedArrow } = useRoofLines(
    corners,
    rect.depth,
    roofType,
    shedDirection,
  );

  const {
    widthLeft,
    widthRight,
    capStartPos,
    capEndPos,
    breakStartPos,
    breakEndPos,
    rotateHandlePos,
    rotateTorusRadius,
  } = useHandlePositions(rect, endPt);
  const controlY = controlsOnRoof ? getRectangleControlY(rect) : startPt.y;
  const liftControl = (point: typeof startPt) => point.clone().setY(controlY);
  const controlStartPt = liftControl(startPt);
  const controlEndPt = liftControl(endPt);
  const controlWidthLeft = liftControl(widthLeft);
  const controlWidthRight = liftControl(widthRight);
  const controlCapStartPos = liftControl(capStartPos);
  const controlCapEndPos = liftControl(capEndPos);
  const controlBreakStartPos = liftControl(breakStartPos);
  const controlBreakEndPos = liftControl(breakEndPos);
  const controlRotateHandlePos = liftControl(rotateHandlePos);
  const controlRotateLinePoints = [controlEndPt, controlRotateHandlePos] as [
    typeof endPt,
    typeof rotateHandlePos,
  ];

  return (
    <group>
      {!controlsOnly && (
        <RoofBody
          geometry={geometry}
          color={rect.color}
          isSelected={isSelected}
          outlinePoints={outlinePoints}
          startPt={startPt}
          endPt={endPt}
          isPolygonFootprint={isPolygonFootprint}
          rectId={rect.id}
          onRectPointerDown={onRectPointerDown}
        />
      )}

      {!controlsOnly && !isPolygonFootprint && (
        <RoofLines
          ridgePoints={ridgePoints}
          hipLines={hipLines}
          gambrelLines={gambrelLines}
          shedArrow={shedArrow}
        />
      )}

      {(isSelected || showMergeHandles) && !isPolygonFootprint && (
        <DragHandles
          startPt={controlStartPt}
          endPt={controlEndPt}
          mergeStart={!!rect.mergeStart}
          mergeEnd={!!rect.mergeEnd}
          rectId={rect.id}
          onHandlePointerDown={onHandlePointerDown}
        />
      )}

      {isSelected && !isPolygonFootprint && (
        <>
          <WidthHandles
            widthLeft={controlWidthLeft}
            widthRight={controlWidthRight}
            rectId={rect.id}
            onWidthHandlePointerDown={onWidthHandlePointerDown}
          />

          <RotateHandle
            rotateHandlePos={controlRotateHandlePos}
            rotateLinePoints={controlRotateLinePoints}
            rotateTorusRadius={rotateTorusRadius}
            rectId={rect.id}
            onRotateHandlePointerDown={onRotateHandlePointerDown}
          />

          <CapToggles
            capStartPos={controlCapStartPos}
            capEndPos={controlCapEndPos}
            startCap={rect.startCap}
            endCap={rect.endCap}
            mergeStart={!!rect.mergeStart}
            mergeEnd={!!rect.mergeEnd}
            rectId={rect.id}
            onToggleCap={onToggleCap}
          />

          <BreakConnectionButtons
            breakStartPos={controlBreakStartPos}
            breakEndPos={controlBreakEndPos}
            mergeStart={!!rect.mergeStart}
            mergeEnd={!!rect.mergeEnd}
            rectId={rect.id}
            onBreakConnection={onBreakConnection}
          />
        </>
      )}
    </group>
  );
};

export default RectangleGroup;
