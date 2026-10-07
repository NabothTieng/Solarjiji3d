import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  sunDateAtom,
  sunTimeAtom,
  worldOriginGeoAtom,
  activePanelAtom,
} from "../../store/atoms";
import {
  getSunPosition,
  sunPositionToLightParams,
  buildDate,
} from "../../utils/sunPosition";

const panelStyle: React.CSSProperties = {
  position: "absolute",
  left: 72,
  top: 0,
  width: 300,
  height: "100%",
  background: "#1e1e2e",
  color: "#cdd6f4",
  borderRight: "1px solid #313244",
  display: "flex",
  flexDirection: "column",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 13,
  zIndex: 200,
  overflow: "hidden",
  transition: "left 0.2s ease",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #313244",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.3,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  userSelect: "none",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "#313244",
  border: "1px solid #45475a",
  borderRadius: 6,
  color: "#cdd6f4",
  padding: "4px 8px",
  fontSize: 13,
  fontFamily: "inherit",
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: "#89b4fa",
};


const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "#a6adc8",
};

const toDeg = (rad: number) => ((rad * 180) / Math.PI).toFixed(1);

export function LightControlPanel() {
  const [dateStr, setDateStr] = useAtom(sunDateAtom);
  const [timeStr, setTimeStr] = useAtom(sunTimeAtom);
  const activePanel = useAtomValue(activePanelAtom);

  const geo = useAtomValue(worldOriginGeoAtom);

  const sunInfo = useMemo(() => {
    const date = buildDate(dateStr, timeStr);
    const sun = getSunPosition(date, geo.lat, geo.lng);
    const light = sunPositionToLightParams(sun);
    return { sun, light };
  }, [dateStr, timeStr, geo.lat, geo.lng]);


  const timeMinutes = useMemo(() => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }, [timeStr]);

  const setTimeFromMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    setTimeStr(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  };

  if (activePanel !== "sun") return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>
          {sunInfo.light.isDay ? "☀️" : "🌙"} Sun Position
        </span>
      </div>
        <div style={bodyStyle}>
          <div>
            <div style={{ fontSize: 11, color: "#a6adc8", marginBottom: 4 }}>
              Date
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#a6adc8", marginBottom: 4 }}>
              Time of Day
            </div>
            <div style={rowStyle}>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                style={{ ...inputStyle, flex: "none", width: 100 }}
              />
              <input
                type="range"
                min={0}
                max={1439}
                step={1}
                value={timeMinutes}
                onChange={(e) => setTimeFromMinutes(Number(e.target.value))}
                style={sliderStyle}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #313244",
              paddingTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={infoRowStyle}>
              <span>Altitude</span>
              <span>{toDeg(sunInfo.sun.altitude)}°</span>
            </div>
            <div style={infoRowStyle}>
              <span>Azimuth</span>
              <span>{toDeg(sunInfo.sun.azimuth)}°</span>
            </div>
            <div style={infoRowStyle}>
              <span>Location</span>
              <span>
                {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
    </div>
  );
}
