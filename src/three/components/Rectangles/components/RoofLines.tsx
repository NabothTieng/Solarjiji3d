import { Line } from "@react-three/drei";
import type { Vector3 } from "three";

interface RoofLinesProps {
  ridgePoints: Vector3[] | null;
  hipLines: Vector3[][] | null;
  gambrelLines: {
    leftBreak: Vector3[];
    rightBreak: Vector3[];
  } | null;
  shedArrow: {
    body: Vector3[];
    head: Vector3[];
  } | null;
}

const RoofLines = ({
  ridgePoints,
  hipLines,
  gambrelLines,
  shedArrow,
}: RoofLinesProps) => (
  <>
    {ridgePoints && (
      <Line points={ridgePoints} color="#8B4513" lineWidth={3} />
    )}

    {hipLines?.map((line, i) => (
      <Line key={`hip-${i}`} points={line} color="#8B4513" lineWidth={2} />
    ))}

    {shedArrow && (
      <>
        <Line points={shedArrow.body} color="#8B4513" lineWidth={3} />
        <Line points={shedArrow.head} color="#8B4513" lineWidth={3} />
      </>
    )}

    {gambrelLines && (
      <>
        <Line points={gambrelLines.leftBreak} color="#8B4513" lineWidth={2} />
        <Line points={gambrelLines.rightBreak} color="#8B4513" lineWidth={2} />
      </>
    )}
  </>
);

export default RoofLines;
