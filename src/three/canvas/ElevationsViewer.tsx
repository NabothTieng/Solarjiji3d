import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import * as THREE from "three";
import { fullscreenViewAtom } from "../../store/atoms";
import { rectanglesAtom } from "../store/rectangleStore";
import { Trees3D } from "../components/Tree3D";
import type { Rectangle3D } from "../store/rectangleStore";
import { BuildingRenderer } from "./components/BuildingRenderer";
import { SceneLighting } from "./components/SceneLighting";
import { ViewerHeader } from "./components/ViewerHeader";
import { ViewerShell } from "./components/ViewerShell";
import { FullscreenToggle } from "./components/FullscreenToggle";
import { PITCH_SLOPE } from "../constants";
import {
  selectedRectangleIdAtom,
  getRectRotation,
} from "../store/rectangleStore";

type Direction = "South" | "West" | "North" | "East";

const DIRECTION_PAIRS = [
  {
    label1: "Front",
    dir1: "South" as Direction,
    label2: "Back",
    dir2: "North" as Direction,
  },
  {
    label1: "Left",
    dir1: "West" as Direction,
    label2: "Right",
    dir2: "East" as Direction,
  },
];

// ---------------------------------------------------------------------------
// Camera controller that keeps orthographic camera level and centred
// ---------------------------------------------------------------------------

function CameraController({
  center,
  direction,
  zoom,
}: {
  center: [number, number, number];
  direction: Direction;
  zoom: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const dist = 50;
    let pos: [number, number, number];
    switch (direction) {
      case "South":
        pos = [center[0], center[1], center[2] + dist];
        break;
      case "North":
        pos = [center[0], center[1], center[2] - dist];
        break;
      case "East":
        pos = [center[0] + dist, center[1], center[2]];
        break;
      case "West":
        pos = [center[0] - dist, center[1], center[2]];
        break;
    }
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(center[0], center[1], center[2]);
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = zoom;
    }
    camera.updateProjectionMatrix();
  }, [camera, center, direction, zoom]);

  return null;
}

// ---------------------------------------------------------------------------
// Interactive elevation handles for wall height & pitch slope
// ---------------------------------------------------------------------------

function ElevationHandles({
  rectangles,
  direction,
}: {
  rectangles: Rectangle3D[];
  direction: Direction;
}) {
  const setRectangles = useSetAtom(rectanglesAtom);
  const [selectedId, setSelectedId] = useAtom(selectedRectangleIdAtom);
  const { camera, gl, size } = useThree();
  const dragging = useRef<{
    rectId: string;
    type: "height" | "pitch";
    startY: number;
    startValue: number;
  } | null>(null);

  const updateRect = useCallback(
    (id: string, updates: Partial<Rectangle3D>) => {
      setRectangles((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    },
    [setRectangles],
  );

  // Convert screen Y delta to world Y delta for orthographic camera
  const screenToWorldY = useCallback(
    (deltaPixels: number) => {
      if (camera instanceof THREE.OrthographicCamera) {
        const viewHeight =
          (camera.top - camera.bottom) / camera.zoom;
        return (deltaPixels / size.height) * viewHeight;
      }
      return deltaPixels * 0.01;
    },
    [camera, size],
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dy = -(e.clientY - dragging.current.startY);
      const worldDy = screenToWorldY(dy);
      const { rectId, type, startValue } = dragging.current;
      if (type === "height") {
        updateRect(rectId, {
          wallHeight: Math.max(0.1, startValue + worldDy),
        });
      } else {
        updateRect(rectId, {
          pitchAngle: Math.max(0.05, startValue + worldDy * 2),
        });
      }
    };

    const onPointerUp = () => {
      if (dragging.current) {
        dragging.current = null;
        canvas.style.cursor = "";
      }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, screenToWorldY, updateRect]);

  // Compute per-rectangle handle positions
  const handles = useMemo(() => {
    return rectangles.map((rect) => {
      const wallH = rect.wallHeight;
      const pitchSlope = rect.pitchAngle ?? PITCH_SLOPE;
      const ridgeH = wallH + (rect.depth / 2) * pitchSlope;

      // Center of the building footprint
      const cx = (rect.start[0] + rect.end[0]) / 2;
      const cz = (rect.start[2] + rect.end[2]) / 2;

      // Get the visible width of the building for this direction
      const rotation = getRectRotation(rect);
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const halfLen =
        Math.sqrt(
          (rect.end[0] - rect.start[0]) ** 2 +
            (rect.end[2] - rect.start[2]) ** 2,
        ) / 2;
      const halfD = rect.depth / 2;

      // Wall-height handle: sits at the eave line at the right edge of the building
      // Pitch handle: sits at the ridge top

      let wallHandlePos: [number, number, number];
      let pitchHandlePos: [number, number, number];

      // For the elevation view, we project handles to positions that make
      // sense from the viewing direction
      switch (direction) {
        case "South":
        case "North": {
          // Viewing along Z axis: building extends in X
          const left = cx - Math.abs(halfLen * cos) - Math.abs(halfD * sin);
          const right = cx + Math.abs(halfLen * cos) + Math.abs(halfD * sin);
          const edgeX = direction === "South" ? right + 0.15 : left - 0.15;
          wallHandlePos = [edgeX, wallH, cz];
          pitchHandlePos = [cx, ridgeH, cz];
          break;
        }
        case "East":
        case "West": {
          // Viewing along X axis: building extends in Z
          const front = cz - Math.abs(halfLen * sin) - Math.abs(halfD * cos);
          const back = cz + Math.abs(halfLen * sin) + Math.abs(halfD * cos);
          const edgeZ = direction === "West" ? back + 0.15 : front - 0.15;
          wallHandlePos = [cx, wallH, edgeZ];
          pitchHandlePos = [cx, ridgeH, cz];
          break;
        }
      }

      return {
        rect,
        wallHandlePos,
        pitchHandlePos,
        wallHeight: wallH,
        ridgeHeight: ridgeH,
      };
    });
  }, [rectangles, direction]);

  const startDrag = useCallback(
    (
      e: THREE.Event & { stopPropagation: () => void },
      rectId: string,
      type: "height" | "pitch",
      startValue: number,
    ) => {
      e.stopPropagation();
      // Get original DOM event
      const nativeEvent = (e as unknown as { nativeEvent?: PointerEvent })
        .nativeEvent;
      if (!nativeEvent) return;
      dragging.current = {
        rectId,
        type,
        startY: nativeEvent.clientY,
        startValue,
      };
      gl.domElement.style.cursor = "ns-resize";
      setSelectedId(rectId);
    },
    [gl, setSelectedId],
  );

  return (
    <group>
      {handles.map(({ rect, wallHandlePos, pitchHandlePos, wallHeight: wh }) => {
        const isSelected = rect.id === selectedId;
        const pitchSlope = rect.pitchAngle ?? PITCH_SLOPE;
        return (
          <group key={rect.id}>
            {/* Wall height handle — horizontal bar at eave */}
            <mesh
              position={wallHandlePos}
              onPointerDown={(e) => startDrag(e, rect.id, "height", wh)}
              onPointerEnter={() => {
                gl.domElement.style.cursor = "ns-resize";
              }}
              onPointerLeave={() => {
                if (!dragging.current) gl.domElement.style.cursor = "";
              }}
            >
              <boxGeometry args={[0.22, 0.08, 0.22]} />
              <meshStandardMaterial
                color={isSelected ? "#42a5f5" : "#90caf9"}
                emissive={isSelected ? "#1565c0" : "#1e88e5"}
                emissiveIntensity={0.4}
              />
            </mesh>

            {/* Pitch slope handle — diamond at ridge */}
            {rect.roofType !== "flat" && (
              <mesh
                position={pitchHandlePos}
                rotation={[0, 0, Math.PI / 4]}
                onPointerDown={(e) =>
                  startDrag(e, rect.id, "pitch", pitchSlope)
                }
                onPointerEnter={() => {
                  gl.domElement.style.cursor = "ns-resize";
                }}
                onPointerLeave={() => {
                  if (!dragging.current) gl.domElement.style.cursor = "";
                }}
              >
                <boxGeometry args={[0.16, 0.16, 0.16]} />
                <meshStandardMaterial
                  color={isSelected ? "#ff7043" : "#ffab91"}
                  emissive={isSelected ? "#d84315" : "#e64a19"}
                  emissiveIntensity={0.4}
                />
              </mesh>
            )}

            {/* Dimension labels */}
            {isSelected && (
              <DimensionLabels
                wallHandlePos={wallHandlePos}
                pitchHandlePos={pitchHandlePos}
                wallHeight={wh}
                pitchAngle={pitchSlope}
                roofType={rect.roofType}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Dimension annotation lines + labels displayed via HTML overlay
// ---------------------------------------------------------------------------

function DimensionLabels({
  wallHandlePos,
  pitchHandlePos,
  wallHeight,
  pitchAngle,
  roofType,
}: {
  wallHandlePos: [number, number, number];
  pitchHandlePos: [number, number, number];
  wallHeight: number;
  pitchAngle: number;
  roofType: string;
}) {
  // Vertical dashed line from ground to wall handle
  const wallLinePoints = useMemo(
    () => [
      new THREE.Vector3(wallHandlePos[0], 0, wallHandlePos[2]),
      new THREE.Vector3(...wallHandlePos),
    ],
    [wallHandlePos],
  );

  return (
    <group>
      {/* Wall height dimension line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                wallLinePoints[0].x,
                wallLinePoints[0].y,
                wallLinePoints[0].z,
                wallLinePoints[1].x,
                wallLinePoints[1].y,
                wallLinePoints[1].z,
              ]),
              3,
            ]}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#42a5f5" linewidth={1} />
      </line>

      {/* Wall height label */}
      <sprite
        position={[
          wallHandlePos[0],
          wallHeight / 2,
          wallHandlePos[2],
        ]}
        scale={[0.8, 0.25, 1]}
      >
        <spriteMaterial>
          <canvasTexture
            attach="map"
            image={createLabelCanvas(
              `H: ${wallHeight.toFixed(2)}`,
              "#42a5f5",
            )}
          />
        </spriteMaterial>
      </sprite>

      {/* Pitch label */}
      {roofType !== "flat" && (
        <sprite
          position={[
            pitchHandlePos[0],
            pitchHandlePos[1] + 0.2,
            pitchHandlePos[2],
          ]}
          scale={[0.8, 0.25, 1]}
        >
          <spriteMaterial>
            <canvasTexture
              attach="map"
              image={createLabelCanvas(
                `P: ${pitchAngle.toFixed(2)}`,
                "#ff7043",
              )}
            />
          </spriteMaterial>
        </sprite>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Utility: render text to a canvas for use as a sprite texture
// ---------------------------------------------------------------------------

const labelCanvasCache = new Map<string, HTMLCanvasElement>();

function createLabelCanvas(text: string, color: string): HTMLCanvasElement {
  const key = `${text}:${color}`;
  const cached = labelCanvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.roundRect(2, 2, 252, 60, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);

  // Limit cache size to prevent unbounded growth during drags
  if (labelCanvasCache.size > 200) labelCanvasCache.clear();
  labelCanvasCache.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// Elevation canvas for a single direction
// ---------------------------------------------------------------------------

function ElevationView({
  direction,
  rectangles,
}: {
  direction: Direction;
  rectangles: Rectangle3D[];
}) {
  const center = useMemo(() => {
    if (rectangles.length === 0) return [0, 1, 0] as [number, number, number];
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    let maxH = 0;
    for (const r of rectangles) {
      const sx = r.start[0],
        ex = r.end[0];
      const sz = r.start[2],
        ez = r.end[2];
      const halfD = r.depth / 2;
      minX = Math.min(minX, sx - halfD, ex - halfD);
      maxX = Math.max(maxX, sx + halfD, ex + halfD);
      minZ = Math.min(minZ, sz - halfD, ez - halfD);
      maxZ = Math.max(maxZ, sz + halfD, ez + halfD);
      const h = r.wallHeight + (r.depth / 2) * (r.pitchAngle ?? 0.5);
      maxH = Math.max(maxH, h);
    }
    return [(minX + maxX) / 2, maxH / 2, (minZ + maxZ) / 2] as [
      number,
      number,
      number,
    ];
  }, [rectangles]);

  const zoom = useMemo(() => {
    if (rectangles.length === 0) return 30;
    let maxSpan = 2;
    for (const r of rectangles) {
      const dx = Math.abs(r.end[0] - r.start[0]) + r.depth;
      const dz = Math.abs(r.end[2] - r.start[2]) + r.depth;
      const h = r.wallHeight + (r.depth / 2) * (r.pitchAngle ?? 0.5) + 1;
      maxSpan = Math.max(maxSpan, dx, dz, h);
    }
    return Math.max(15, 220 / maxSpan);
  }, [rectangles]);

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ width: "100%", height: "100%", background: "#f5f5f5" }}
    >
      <Suspense fallback={null}>
        <OrthographicCamera
          makeDefault
          near={0.1}
          far={200}
        />
        <CameraController
          center={center}
          direction={direction}
          zoom={zoom}
        />
        <ambientLight intensity={0.6} />
        <SceneLighting castShadow={false} />
        <group>
          <BuildingRenderer rectangles={rectangles} />
          <Trees3D />
        </group>
        <ElevationHandles rectangles={rectangles} direction={direction} />
      </Suspense>
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Direction toggle buttons
// ---------------------------------------------------------------------------

function DirectionTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: Direction;
  onTabChange: (dir: Direction) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "6px 8px",
        borderTop: "1px solid #e0e0e0",
        flexShrink: 0,
        justifyContent: "center",
      }}
    >
      {DIRECTION_PAIRS.map((pair) => (
        <div
          key={pair.label1}
          style={{
            display: "flex",
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid #e0e0e0",
          }}
        >
          <button
            onClick={() => onTabChange(pair.dir1)}
            style={{
              padding: "5px 12px",
              border: "none",
              background: activeTab === pair.dir1 ? "#f57c00" : "#fff",
              color: activeTab === pair.dir1 ? "#fff" : "#666",
              fontSize: 11,
              fontWeight: activeTab === pair.dir1 ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {pair.label1}
          </button>
          <button
            onClick={() => onTabChange(pair.dir2)}
            style={{
              padding: "5px 12px",
              border: "none",
              borderLeft: "1px solid #e0e0e0",
              background: activeTab === pair.dir2 ? "#f57c00" : "#fff",
              color: activeTab === pair.dir2 ? "#fff" : "#666",
              fontSize: 11,
              fontWeight: activeTab === pair.dir2 ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {pair.label2}
          </button>
        </div>
      ))}
    </div>
  );
}

const ElevationsViewer = () => {
  const rectangles = useAtomValue(rectanglesAtom);
  const [activeTab, setActiveTab] = useState<Direction>("South");
  const [fullscreenView, setFullscreenView] = useAtom(fullscreenViewAtom);

  const maxHeight = useMemo(() => {
    if (rectangles.length === 0) return 0;
    return Math.max(...rectangles.map((r) => r.wallHeight));
  }, [rectangles]);

  return (
    <ViewerShell>
      <ViewerHeader title="Elevations">
        <FullscreenToggle
          isFullscreen={fullscreenView === "elevation"}
          onToggle={() =>
            setFullscreenView(
              fullscreenView === "elevation" ? null : "elevation",
            )
          }
        />
      </ViewerHeader>

      {maxHeight > 0 && (
        <div
          style={{
            padding: "4px 10px",
            fontSize: 12,
            color: "#555",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
            }}
          />
          Max height:
          <span>{Math.round(maxHeight * 1000)} mm</span>
        </div>
      )}

      <div
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          background: "#f5f5f5",
        }}
      >
        <ElevationView direction={activeTab} rectangles={rectangles} />
      </div>

      <DirectionTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </ViewerShell>
  );
};

export default ElevationsViewer;
