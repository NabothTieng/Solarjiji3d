import { useMemo } from "react";
import { useAtomValue } from "jotai";
import {
  sunDateAtom,
  sunTimeAtom,
  worldOriginGeoAtom,
} from "../../../store/atoms";
import {
  getSunPosition,
  sunPositionToLightParams,
  buildDate,
} from "../../../utils/sunPosition";

interface SceneLightingProps {
  castShadow?: boolean;
  shadowSize?: number;
}

export function SceneLighting({
  castShadow = true,
  shadowSize = 20,
}: SceneLightingProps) {
  const dateStr = useAtomValue(sunDateAtom);
  const timeStr = useAtomValue(sunTimeAtom);
  const geo = useAtomValue(worldOriginGeoAtom);

  const { position, intensity } = useMemo(() => {
    const date = buildDate(dateStr, timeStr);
    const sun = getSunPosition(date, geo.lat, geo.lng);
    return sunPositionToLightParams(sun, shadowSize * 1.5);
  }, [dateStr, timeStr, geo.lat, geo.lng, shadowSize]);

  if (!castShadow) {
    return <directionalLight position={position} intensity={intensity} />;
  }

  return (
    <directionalLight
      position={position}
      intensity={intensity}
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-camera-left={-shadowSize}
      shadow-camera-right={shadowSize}
      shadow-camera-top={shadowSize}
      shadow-camera-bottom={-shadowSize}
      shadow-camera-near={0.1}
      shadow-camera-far={shadowSize * 2.5}
      shadow-bias={-0.0005}
      shadow-normalBias={0.02}
    />
  );
}
