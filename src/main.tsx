import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SolarPlanner } from "./SolarPlanner";
import { Analytics } from "@vercel/analytics/react";

function parseHeaders(raw: string | undefined): HeadersInit | undefined {
  console.log("raw", raw);
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw) as HeadersInit;
  } catch {
    console.warn("Invalid VITE_SOLAR_API_HEADERS; expected a JSON object.");
    return undefined;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SolarPlanner
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
      solarApiBaseUrl={import.meta.env.VITE_SOLAR_API_BASE_URL || ""}
      solarApiHeaders={parseHeaders(import.meta.env.VITE_SOLAR_API_HEADERS)}
      onSave={(data) => console.log("Save:", data)}
    />
    <Analytics />
  </StrictMode>,
);
