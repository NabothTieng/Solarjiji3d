import { useCallback, useRef, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  clampMapZoom,
  FALLBACK_MAX_GOOGLE_MAP_ZOOM,
  mapCenterAtom,
  mapMaxZoomAtom,
  mapZoomAtom,
  MIN_GOOGLE_MAP_ZOOM,
} from "../store/atoms";
import { Box, HStack, VStack } from "@chakra-ui/react";
import { useSolarPlannerConfig } from "../context/SolarPlannerConfigContext";

const mapOptions: google.maps.MapOptions = {
  mapTypeId: "satellite",
  disableDefaultUI: true,
  zoomControl: false,
  rotateControl: false,
  tilt: 0,
  gestureHandling: "none",
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  keyboardShortcuts: false,
  draggable: false,
  scrollwheel: false,
  disableDoubleClickZoom: true,
};

const API_KEY_ENV = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = [];

export function GoogleMapView() {
  const config = useSolarPlannerConfig();
  const apiKey = config.googleMapsApiKey || API_KEY_ENV;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const center = useAtomValue(mapCenterAtom);
  const [zoom, setZoom] = useAtom(mapZoomAtom);
  const maxZoom = useAtomValue(mapMaxZoomAtom);
  const setMaxZoom = useSetAtom(mapMaxZoomAtom);

  const mapRef = useRef<google.maps.Map | null>(null);
  const maxZoomServiceRef = useRef<google.maps.MaxZoomService | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    maxZoomServiceRef.current = new google.maps.MaxZoomService();
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    maxZoomServiceRef.current = null;
    setMapReady(false);
  }, []);

  useEffect(() => {
    if (!mapReady || !maxZoomServiceRef.current) return;
    let cancelled = false;

    maxZoomServiceRef.current.getMaxZoomAtLatLng(center, (result) => {
      if (cancelled) return;
      const nextMaxZoom =
        result.status === google.maps.MaxZoomStatus.OK &&
        typeof result.zoom === "number"
          ? Math.max(MIN_GOOGLE_MAP_ZOOM, result.zoom)
          : FALLBACK_MAX_GOOGLE_MAP_ZOOM;

      setMaxZoom(nextMaxZoom);
      setZoom((current) => clampMapZoom(current, nextMaxZoom));
    });

    return () => {
      cancelled = true;
    };
  }, [center, mapReady, setMaxZoom, setZoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    const clampedZoom = clampMapZoom(zoom, maxZoom);
    if (clampedZoom !== zoom) {
      setZoom(clampedZoom);
      return;
    }

    mapRef.current.moveCamera({
      center,
      zoom: clampedZoom,
    });
  }, [center, maxZoom, setZoom, zoom]);

  if (loadError) {
    return (
      <VStack
        w={"full"}
        h={"full"}
        alignItems={"center"}
        justifyContent={"center"}
        bg={"#1a1a2e"}
        color={"#cdd6f4"}
        gap={12}
      >
        <Box fontSize={24}>🗺️</Box>
        <Box fontSize={14}>Google Maps failed to load.</Box>
      </VStack>
    );
  }

  if (!isLoaded) {
    return (
      <HStack
        w={"full"}
        h={"full"}
        alignItems={"center"}
        justifyContent={"center"}
        bg={"#1a1a2e"}
        color={"#000000"}
      >
        Loading Google Maps...
      </HStack>
    );
  }

  return (
    <Box w={"full"} h={"full"} pointerEvents={"none"}>
      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height: "100%",
        }}
        center={center}
        zoom={clampMapZoom(zoom, maxZoom)}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{ ...mapOptions, maxZoom, minZoom: MIN_GOOGLE_MAP_ZOOM }}
      />
    </Box>
  );
}
