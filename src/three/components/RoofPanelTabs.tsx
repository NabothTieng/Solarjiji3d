import { useAtom } from "jotai";
import { Home, LayoutGrid, Factory } from "lucide-react";
import { roofPanelTabAtom } from "../../store/atoms";

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #313244",
  background: "rgba(24, 24, 37, 0.97)",
  flexShrink: 0,
};

const tabBase: React.CSSProperties = {
  flex: 1,
  padding: "clamp(0.45rem, 0.9vh, 0.65rem) clamp(0.35rem, 0.6vw, 0.5rem)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "clamp(0.25rem, 0.45vw, 0.4rem)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#a6adc8",
  fontSize: "clamp(0.62rem, 0.7vw, 0.75rem)",
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  borderBottom: "0.125rem solid transparent",
  transition: "color 0.15s, border-color 0.15s, background 0.15s",
};

const tabActive: React.CSSProperties = {
  ...tabBase,
  color: "#ffa500",
  borderBottomColor: "#ffa500",
  background: "rgba(40, 40, 50, 0.97)",
};

export function RoofPanelTabs() {
  const [tab, setTab] = useAtom(roofPanelTabAtom);

  return (
    <div style={tabBarStyle}>
      <button
        type="button"
        style={tab === "roof" ? tabActive : tabBase}
        onClick={() => setTab("roof")}
      >
        <Home size="clamp(0.85rem, 1vw, 1rem)" strokeWidth={1.75} />
        Roof
      </button>
      <button
        type="button"
        style={tab === "solar" ? tabActive : tabBase}
        onClick={() => setTab("solar")}
      >
        <LayoutGrid size="clamp(0.85rem, 1vw, 1rem)" strokeWidth={1.75} />
        Solar
      </button>
      <button
        type="button"
        style={tab === "chimney" ? tabActive : tabBase}
        onClick={() => setTab("chimney")}
      >
        <Factory size="clamp(0.85rem, 1vw, 1rem)" strokeWidth={1.75} />
        Chimney
      </button>
    </div>
  );
}
