import { useMemo } from "react";
import type { Rectangle3D } from "../../store/rectangleStore";
import { Building3D } from "../../components/Building3D";
import { MergedBuildingCSG } from "../../components/MergedBuildingCSG";
import { findMergeGroups, getMergedRectIds } from "../../helpers/mergeGroups";


export function BuildingRenderer({
  rectangles,
  enableRoofDrag = false,
}: {
  rectangles: Rectangle3D[];
  enableRoofDrag?: boolean;
}) {
  const mergeGroups = useMemo(() => findMergeGroups(rectangles), [rectangles]);
  const mergedIds = useMemo(() => getMergedRectIds(mergeGroups), [mergeGroups]);
  const standaloneRects = useMemo(
    () => rectangles.filter((r) => !mergedIds.has(r.id)),
    [rectangles, mergedIds],
  );

  return (
    <>
      <MergedBuildingCSG groups={mergeGroups} enableRoofDrag={enableRoofDrag} />
      {standaloneRects.map((rect) => (
        <Building3D
          key={rect.id}
          rect={rect}
          allRects={rectangles}
          enableRoofDrag={enableRoofDrag}
        />
      ))}
    </>
  );
}
