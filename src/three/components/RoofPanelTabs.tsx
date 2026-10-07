import { useAtom } from "jotai";
import { Home, LayoutGrid, Factory } from "lucide-react";
import { roofPanelTabAtom } from "../../store/atoms";

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #313244",
  background: "#181825",
  flexShrink: 0,
};

const tabBase: React.CSSProperties = {
  flex: 1,
  padding: "10px 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#a6adc8",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  borderBottom: "2px solid transparent",
  transition: "color 0.15s, border-color 0.15s, background 0.15s",
};

const tabActive: React.CSSProperties = {
  ...tabBase,
  color: "#89b4fa",
  borderBottomColor: "#89b4fa",
  background: "#1e1e2e",
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
        <Home size={14} strokeWidth={1.75} />
        Roof
      </button>
      <button
        type="button"
        style={tab === "solar" ? tabActive : tabBase}
        onClick={() => setTab("solar")}
      >
        <LayoutGrid size={14} strokeWidth={1.75} />
        Solar
      </button>
      <button
        type="button"
        style={tab === "chimney" ? tabActive : tabBase}
        onClick={() => setTab("chimney")}
      >
        <Factory size={14} strokeWidth={1.75} />
        Chimney
      </button>
    </div>
  );
}
