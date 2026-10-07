import { MapControls, OrthographicCamera } from "@react-three/drei";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MapControls as MapControlsImp } from "three-stdlib";
import {
  interactionModeAtom,
  isDraggingHandleAtom,
} from "../../store/rectangleStore";
import {
  clampMapZoom,
  INITIAL_MAP_ZOOM,
  INITIAL_ORTHO_ZOOM,
  mapCenterAtom,
  mapMaxZoomAtom,
  mapZoomAtom,
  mapZoomToOrthoZoom,
  computeMetersPerPixel,
  worldOffsetToGeo,
  worldOriginGeoAtom,
} from "../../../store/atoms";

const CameraController = () => {
  const mode = useAtomValue(interactionModeAtom);
  const isDraggingHandle = useAtomValue(isDraggingHandleAtom);
  const setMapCenter = useSetAtom(mapCenterAtom);
  const setMapZoom = useSetAtom(mapZoomAtom);
  const mapMaxZoom = useAtomValue(mapMaxZoomAtom);
  const worldOriginGeo = useAtomValue(worldOriginGeoAtom);
  const controlsRef = useRef<MapControlsImp>(null);
  const maxOrthoZoom = mapZoomToOrthoZoom(mapMaxZoom);


  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      controls.target.set(0, 0, 0);
      controls.object.position.set(0, 10, 0);
      controls.object.zoom = INITIAL_ORTHO_ZOOM;
      controls.object.updateProjectionMatrix();
      controls.update();
    }
    setMapCenter({ ...worldOriginGeo });
    setMapZoom(INITIAL_MAP_ZOOM);
  }, [worldOriginGeo, setMapCenter, setMapZoom]);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object as THREE.OrthographicCamera;

    if (camera.zoom > maxOrthoZoom) {
      camera.zoom = maxOrthoZoom;
      camera.updateProjectionMatrix();
      controls.update();
    }
  }, [maxOrthoZoom]);


  const worldOriginRef = useRef(worldOriginGeo);
  useEffect(() => {
    worldOriginRef.current = worldOriginGeo;
  }, [worldOriginGeo]);


  const lastPushed = useRef({ lat: 0, lng: 0, zoom: 0 });


  useFrame(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const camera = controls.object as THREE.OrthographicCamera;
    const target = controls.target as THREE.Vector3;
    const anchor = worldOriginRef.current;

    if (camera.zoom > maxOrthoZoom) {
      camera.zoom = maxOrthoZoom;
      camera.updateProjectionMatrix();
      controls.update();
    }

    const orthoZoom = camera.zoom;


    const metersPerWorldUnit =
      INITIAL_ORTHO_ZOOM * computeMetersPerPixel(INITIAL_MAP_ZOOM, anchor.lat);

    const { lat: newLat, lng: newLng } = worldOffsetToGeo(
      anchor,
      target.x * metersPerWorldUnit,
      target.z * metersPerWorldUnit,
    );
    const newMapZoom = clampMapZoom(
      INITIAL_MAP_ZOOM + Math.log2(orthoZoom / INITIAL_ORTHO_ZOOM),
      mapMaxZoom,
    );


    const prev = lastPushed.current;
    if (
      Math.abs(prev.lat - newLat) > 1e-8 ||
      Math.abs(prev.lng - newLng) > 1e-8 ||
      Math.abs(prev.zoom - newMapZoom) > 0.001
    ) {
      lastPushed.current = { lat: newLat, lng: newLng, zoom: newMapZoom };
      setMapCenter({ lat: newLat, lng: newLng });
      setMapZoom(newMapZoom);
    }
  });

  return (
    <MapControls
      ref={controlsRef}
      makeDefault
      enableRotate={false}
      enablePan={mode === "select" && !isDraggingHandle}
      enableZoom={true}
      enableDamping={false}
      zoomSpeed={1.0}
      minZoom={mapZoomToOrthoZoom(1)}
      maxZoom={maxOrthoZoom}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 10, 0]}
        zoom={INITIAL_ORTHO_ZOOM}
        near={0.01}
        far={1000}
      />
    </MapControls>
  );
};

export default CameraController;
