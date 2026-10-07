import type { RenderedPanelEntry } from "../store/solarPanelStore";

export interface PanelReportRow {
  index: number;
  roofSideKey: string;
  roofId: string;
  sideIndex: string;
  widthM: number;
  heightM: number;
  tiltDeg: number;
  azimuthDeg: number;
  x: number;
  y: number;
  z: number;
}

export function computePanelAngles(normal: [number, number, number]) {
  const [nx, ny, nz] = normal;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  const ux = nx / len;
  const uy = ny / len;
  const uz = nz / len;
  const tiltRad = Math.acos(Math.min(1, Math.max(-1, Math.abs(uy))));
  const horizLen = Math.sqrt(ux * ux + uz * uz);
  const azimuthRad = horizLen < 1e-4 ? 0 : Math.atan2(ux, -uz);
  return {
    tiltDeg: (tiltRad * 180) / Math.PI,
    azimuthDeg: ((azimuthRad * 180) / Math.PI + 360) % 360,
  };
}

export function buildPanelReport(
  renderedPanels: Map<string, RenderedPanelEntry>,
  metersPerUnit: number,
): PanelReportRow[] {
  const out: PanelReportRow[] = [];
  let i = 1;
  for (const [roofSideKey, entry] of renderedPanels) {
    const [roofId, sideIndex] = roofSideKey.split(":");
    const wM = entry.panelWidth * metersPerUnit;
    const hM = entry.panelHeight * metersPerUnit;
    for (const p of entry.panels) {
      const { tiltDeg, azimuthDeg } = computePanelAngles(p.normal);
      out.push({
        index: i++,
        roofSideKey,
        roofId: roofId ?? roofSideKey,
        sideIndex: sideIndex ?? "",
        widthM: wM,
        heightM: hM,
        tiltDeg,
        azimuthDeg,
        x: p.position[0] * metersPerUnit,
        y: p.position[1] * metersPerUnit,
        z: p.position[2] * metersPerUnit,
      });
    }
  }
  return out;
}
