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

const UMBER = "#fab387";
const PANEL_BG = "rgba(30, 30, 46, 0.96)";
const TEXT = "#cdd6f4";
const MUTED = "#a6adc8";
const BORDER = "rgba(255,255,255,0.08)";

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "clamp(0.5rem, 2vh, 1rem)",
  left: "clamp(4.75rem, 6vw, 5.75rem)",
  width: "clamp(15rem, 18vw, 20rem)",
  maxWidth: "calc(100% - clamp(5.5rem, 7vw, 6.5rem))",
  maxHeight: "calc(100% - clamp(1rem, 4vh, 2rem))",
  background: PANEL_BG,
  color: TEXT,
  border: `0.0625rem solid ${BORDER}`,
  borderRadius: "clamp(0.6rem, 0.9vw, 0.8rem)",
  boxShadow: "0 0.7rem 1.8rem rgba(0,0,0,0.3)",
  backdropFilter: "blur(10px)",
  display: "flex",
  flexDirection: "column",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: "clamp(0.62rem, 0.72vw, 0.74rem)",
  zIndex: 400,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "clamp(0.65rem, 1.1vh, 0.9rem) clamp(0.8rem, 1vw, 1rem)",
  borderBottom: `0.0625rem solid ${BORDER}`,
  fontSize: "clamp(0.78rem, 0.9vw, 0.95rem)",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  userSelect: "none",
};

const bodyStyle: React.CSSProperties = {
  overflowY: "auto",
  padding: "clamp(0.75rem, 1.1vw, 1rem)",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(0.8rem, 1.5vh, 1rem)",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: MUTED,
  fontSize: "clamp(0.56rem, 0.68vw, 0.68rem)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05rem",
  marginBottom: "clamp(0.3rem, 0.6vh, 0.45rem)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(49,50,68,0.82)",
  border: "0.0625rem solid #45475a",
  borderRadius: "clamp(0.3rem, 0.45vw, 0.4rem)",
  color: TEXT,
  padding: "clamp(0.38rem, 0.65vh, 0.5rem) clamp(0.45rem, 0.6vw, 0.6rem)",
  fontSize: "clamp(0.62rem, 0.72vw, 0.74rem)",
  fontFamily: "inherit",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.75rem",
  fontSize: "clamp(0.58rem, 0.66vw, 0.68rem)",
  color: MUTED,
  padding: "clamp(0.2rem, 0.4vh, 0.3rem) 0",
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
    setTimeStr(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  if (activePanel !== "sun") return null;

  return (
    <div style={panelStyle} className="floating-properties-scroll">
      <div style={headerStyle} onClick={() => {}}>
        <span>{sunInfo.light.isDay ? "☀️" : "🌙"} Sun Position</span>
        <span style={{ color: UMBER, fontSize: "clamp(0.8rem, 1vw, 1rem)" }}>▼</span>
      </div>

      <div style={bodyStyle} className="floating-properties-scroll">
        <div>
          <div style={fieldLabelStyle}>Date</div>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={fieldLabelStyle}>
            <span>Time of Day</span>
            <span style={{ color: UMBER }}>{timeStr}</span>
          </div>
          <input
            className="generator-input"
            type="range"
            min={0}
            max={1439}
            step={1}
            value={timeMinutes}
            onChange={(e) => setTimeFromMinutes(Number(e.target.value))}
            style={sliderStyle}
            aria-label="Time of day"
          />
        </div>

        <div
          style={{
            borderTop: `0.0625rem solid ${BORDER}`,
            paddingTop: "clamp(0.45rem, 0.8vh, 0.65rem)",
          }}
        >
          <div style={fieldLabelStyle}>Sun Data</div>
          <div style={infoRowStyle}>
            <span>Altitude</span>
            <span style={{ color: UMBER, fontWeight: 700 }}>{toDeg(sunInfo.sun.altitude)}°</span>
          </div>
          <div style={infoRowStyle}>
            <span>Azimuth</span>
            <span style={{ color: UMBER, fontWeight: 700 }}>{toDeg(sunInfo.sun.azimuth)}°</span>
          </div>
          <div style={infoRowStyle}>
            <span>Location</span>
            <span style={{ color: TEXT, fontWeight: 600 }}>
              {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
