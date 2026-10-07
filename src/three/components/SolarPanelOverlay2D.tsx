import { useMemo } from "react";
import * as THREE from "three";
import { useAtomValue } from "jotai";
import { renderedPanelsAtom } from "../store/solarPanelStore";
import { Y_LINE } from "../constants";


export function SolarPanelOverlay2D() {
  const renderedPanelsMap = useAtomValue(renderedPanelsAtom);

  const panelPositions = useMemo(() => {
    const result: { position: [number, number, number]; yAngle: number; width: number; height: number }[] = [];

    renderedPanelsMap.forEach((entry) => {
      for (const panel of entry.panels) {

        const yAngle = Math.atan2(panel.right[2], panel.right[0]);
        result.push({
          position: panel.position,
          yAngle,
          width: entry.panelWidth,
          height: entry.panelHeight,
        });
      }
    });

    return result;
  }, [renderedPanelsMap]);

  if (panelPositions.length === 0) return null;

  return (
    <group>
      {panelPositions.map((p, i) => (
        <group key={i}>
          {}
          <mesh
            position={[p.position[0], Y_LINE + 0.02, p.position[2]]}
            rotation={[-Math.PI / 2, 0, -p.yAngle]}
          >
            <planeGeometry args={[p.width * 0.95, p.height * 0.95]} />
            <meshBasicMaterial
              color="#1565c0"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Border outline */}
          <lineLoop
            position={[p.position[0], Y_LINE + 0.025, p.position[2]]}
            rotation={[-Math.PI / 2, 0, -p.yAngle]}
          >
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    -p.width / 2, -p.height / 2, 0,
                     p.width / 2, -p.height / 2, 0,
                     p.width / 2,  p.height / 2, 0,
                    -p.width / 2,  p.height / 2, 0,
                  ]),
                  3,
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#42a5f5" />
          </lineLoop>
        </group>
      ))}
    </group>
  );
}
