import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import * as THREE from "three";
import { fullscreenViewAtom } from "../../store/atoms";
import { rectanglesAtom } from "../store/rectangleStore";
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

type Direction = "South" | "West" | "North" | "East" | "Top";

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
  const controlsRef = useRef<any>(null);
  const initializedDirection = useRef<Direction | null>(null);

  useEffect(() => {
    // Only establish the automatic framing on first load or when the user
    // changes elevation direction. Dragging a height/pitch handle must not
    // reset a user's pan/zoom position.
    if (initializedDirection.current === direction) return;

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
      case "Top":
        pos = [center[0], center[1] + dist, center[2]];
        break;
    }

    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.set(0, 1, 0);
    if (direction === "Top") camera.up.set(0, 0, -1);
    camera.lookAt(center[0], center[1], center[2]);
    if (camera instanceof THREE.OrthographicCamera) camera.zoom = zoom;
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(center[0], center[1], center[2]);
      controlsRef.current.update();
    }

    initializedDirection.current = direction;
  }, [camera, center, direction, zoom]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={false}
      enablePan
      enableZoom
      screenSpacePanning
      minZoom={5}
      maxZoom={80}
      panSpeed={0.9}
      zoomSpeed={0.9}
      mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
    />
  );
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

  // Keep the interactive targets comfortably clickable at any viewport size/zoom.
  const worldPerPixel =
    camera instanceof THREE.OrthographicCamera
      ? (camera.top - camera.bottom) / Math.max(camera.zoom * size.height, 1)
      : 0.01;
  const handleSize = THREE.MathUtils.clamp(worldPerPixel * 34, 0.24, 0.62);
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
      {direction !== "Top" && handles.map(({ rect, wallHandlePos, pitchHandlePos, wallHeight: wh }) => {
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
              <boxGeometry args={[handleSize, Math.max(handleSize * 0.36, 0.08), handleSize]} />
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
                <boxGeometry args={[handleSize * 0.9, handleSize * 0.9, handleSize * 0.9]} />
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
                direction={direction}
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
  direction,
}: {
  wallHandlePos: [number, number, number];
  pitchHandlePos: [number, number, number];
  wallHeight: number;
  pitchAngle: number;
  roofType: string;
  direction: Direction;
}) {
  const wallLabelOffset = useMemo<[number, number, number]>(() => {
    // Keep H inside the elevation frame instead of letting it sit on the
    // building edge where the 2D roof render can clip it.
    switch (direction) {
      case "South": return [-0.75, 0, 0];
      case "North": return [0.75, 0, 0];
      case "East": return [0, 0, 0.75];
      case "West": return [0, 0, -0.75];
      default: return [0, 0, 0];
    }
  }, [direction]);

  const pitchLabelOffset = useMemo<[number, number, number]>(() => {
    switch (direction) {
      case "South": return [0, 0.45, 0.08];
      case "North": return [0, 0.45, -0.08];
      case "East": return [0.08, 0.45, 0];
      case "West": return [-0.08, 0.45, 0];
      default: return [0, 0.45, 0];
    }
  }, [direction]);

  const labelStyle = {
    whiteSpace: "nowrap" as const,
    fontSize: "clamp(0.65rem, 1.05vw, 0.95rem)",
    lineHeight: 1,
    fontWeight: 800,
    padding: "clamp(0.25rem, 0.55vh, 0.4rem) clamp(0.5rem, 0.8vw, 0.75rem)",
    borderRadius: "0.45rem",
    color: "#fff",
    background: "rgba(43,33,29,0.94)",
    boxSizing: "border-box" as const,
    pointerEvents: "none" as const,
    textAlign: "center" as const,
  };

  return (
    <>
      <Html
        position={[wallHandlePos[0] + wallLabelOffset[0], wallHandlePos[1] / 2, wallHandlePos[2] + wallLabelOffset[2]]}
        center
        zIndexRange={[1000, 0]}
        style={{ ...labelStyle, border: "clamp(2px, 0.18vw, 3px) solid #42a5f5" }}
      >
        H: {wallHeight.toFixed(2)}
      </Html>

      {roofType !== "flat" && (
        <Html
          position={[pitchHandlePos[0] + pitchLabelOffset[0], pitchHandlePos[1] + pitchLabelOffset[1], pitchHandlePos[2] + pitchLabelOffset[2]]}
          center
          zIndexRange={[1000, 0]}
          style={{ ...labelStyle, border: "clamp(2px, 0.18vw, 3px) solid #ff7043" }}
        >
          P: {pitchAngle.toFixed(2)}
        </Html>
      )}
    </>
  );
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
      style={{ width: "100%", height: "100%", background: "#ece9e6" }}
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
        <BuildingRenderer rectangles={rectangles} />
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
  const options: Array<{ label: string; direction: Direction }> = [
    { label: "South", direction: "South" },
    { label: "North", direction: "North" },
    { label: "West", direction: "West" },
    { label: "East", direction: "East" },
    { label: "Top", direction: "Top" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: "clamp(0.35rem, 1vw, 0.75rem)",
        padding: "clamp(0.5rem, 1.2vh, 0.8rem) clamp(0.6rem, 1.4vw, 1rem)",
        borderTop: "1px solid rgba(0,0,0,0.14)",
        background: "rgba(255,255,255,0.96)",
        flexShrink: 0,
      }}
    >
      {options.map(({ label, direction }) => {
        const active = activeTab === direction;
        return (
          <button
            key={direction}
            onClick={() => onTabChange(direction)}
            aria-pressed={active}
            style={{
              minWidth: 0,
              minHeight: "clamp(2.5rem, 6vh, 3.5rem)",
              padding: "clamp(0.45rem, 1vh, 0.7rem) clamp(0.45rem, 1vw, 0.9rem)",
              border: active ? "2px solid #f57c00" : "1px solid rgba(0,0,0,0.2)",
              borderRadius: "clamp(0.45rem, 0.8vw, 0.7rem)",
              background: active ? "#f57c00" : "#2b211d",
              color: "#fff",
              fontSize: "clamp(0.78rem, 1.1vw, 1rem)",
              fontWeight: active ? 800 : 650,
              lineHeight: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "clip",
              cursor: "pointer",
              boxShadow: active ? "0 0.15rem 0 rgba(0,0,0,0.16)" : "none",
              transition: "all 0.15s ease",
              touchAction: "manipulation",
            }}
          >
            {label}
          </button>
        );
      })}
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
            padding: "clamp(0.35rem, 0.8vh, 0.55rem) clamp(0.65rem, 1.2vw, 0.95rem)",
            fontSize: "clamp(0.72rem, 1vw, 0.9rem)",
            fontWeight: 650,
            color: "#3a2d27",
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
          background: "#ece9e6",
        }}
      >
        <ElevationView direction={activeTab} rectangles={rectangles} />
      </div>

      <DirectionTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </ViewerShell>
  );
};

export default ElevationsViewer;
