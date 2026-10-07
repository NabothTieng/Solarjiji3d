import { Vector3 } from "three";

export const DrawPreview = ({
  start,
  end,
}: {
  start: Vector3;
  end: Vector3;
}) => {
  const w = Math.abs(end.x - start.x);
  const d = Math.abs(end.z - start.z);
  if (w < 0.05 && d < 0.05) return null;

  return (
    <mesh position={[(start.x + end.x) / 2, 0.015, (start.z + end.z) / 2]}>
      <boxGeometry args={[w || 0.01, 0.02, d || 0.01]} />
      <meshBasicMaterial color="#4287f5" transparent opacity={0.3} />
    </mesh>
  );
};

export const PolygonDraftPreview = ({
  points,
  hoverPoint,
}: {
  points: Vector3[];
  hoverPoint: Vector3 | null;
}) => {
  const visiblePoints = hoverPoint ? [...points, hoverPoint] : points;
  const linePositions = new Float32Array(
    visiblePoints.flatMap((p) => [p.x, 0.04, p.z]),
  );
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <group>
      {visiblePoints.length >= 2 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[linePositions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffa500" />
        </line>
      )}

      {points.length >= 3 && first && last && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  last.x, 0.04, last.z,
                  first.x, 0.04, first.z,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffa500" transparent opacity={0.45} />
        </line>
      )}

      {points.map((point, index) => (
        <mesh key={index} position={[point.x, 0.055, point.z]}>
          <sphereGeometry args={[index === 0 ? 0.09 : 0.065, 12, 12]} />
          <meshBasicMaterial color={index === 0 ? "#ff6f00" : "#ffa500"} />
        </mesh>
      ))}
    </group>
  );
};
