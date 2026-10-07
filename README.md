## Installation
### 1. Authenticate with GitHub Packages

Create `.npmrc`:

```
@sherifzayed:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with a [GitHub personal access token](https://github.com/settings/tokens) that has the `read:packages` scope.

### 2. Install the package

```bash
# npm
npm install @sherifzayed/solar-panels@0.1.0
```

### 3. Peer dependencies

The package expects `react` and `react-dom` (v18 or v19) to be installed in your project.

## Usage

### Basic setup

```tsx
import { SolarPlanner } from "@sherifzayed/solar-panels";

function App() {
  const headers = getHeaders();

  return (
    <SolarPlanner
      googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY"
      solarApiBaseUrl={process.env.NEXT_PUBLIC_FORECAST_PROJECT_API_URL}
      solarApiHeaders={headers}
      defaultCenter={{ lat: 51.5074, lng: -0.1278 }}
      defaultZoom={20}
      onSave={(data) => {
        // Send data to your backend, localStorage, etc.
      }}
    />
  );
}
```

### Loading existing data

```tsx
import { SolarPlanner, type SolarPlannerData } from "@sherifzayed/solar-panels";

function Editor({ savedProject }: { savedProject: SolarPlannerData }) {
  const headers = getHeaders();

  return (
    <SolarPlanner
      googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY"
      solarApiBaseUrl={process.env.NEXT_PUBLIC_FORECAST_PROJECT_API_URL}
      solarApiHeaders={headers}
      initialData={savedProject}
      onSave={async (data) => {
        await fetch("/api/projects/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `googleMapsApiKey` | `string` | **Yes** | Google Maps JavaScript API key. Must have the Maps JavaScript API enabled. |
| `solarApiBaseUrl` | `string` | No | Forecast/project API base URL used for catalog requests. In the portal, pass `NEXT_PUBLIC_FORECAST_PROJECT_API_URL`. |
| `solarApiHeaders` | `HeadersInit` | No | Headers used for solar API requests. In the portal, pass the object returned by `getHeaders()`. |
| `defaultCenter` | `GeoPosition` | No | Default map center (`{ lat, lng }`) when no `initialData` is provided. Defaults to `{ lat: -1.179136, lng: 34.632383 }`. |
| `defaultZoom` | `number` | No | Default Google Maps zoom level (1–21). Defaults to `20`. |
| `initialData` | `Partial<SolarPlannerData>` | No | Pre-populated scene data. Any subset of the full data shape can be provided. |
| `onSave` | `(data: SolarPlannerData) => void` | No | Callback fired when the user clicks the **Save** button. Receives the complete current state. If not provided, the Save button is hidden. |
| `dailyEnergyTargetKwh` | `number` | No | Daily energy sizing target in kWh/day. Used to derive the internal capacity target. Defaults to `1000` kWh/day when neither this nor saved/explicit capacity data is provided. |
| `maxCapacityWatts` | `number` | No | Explicit installed-capacity sizing target in watts. Takes precedence over `dailyEnergyTargetKwh`. |
| `theme` | `ThemeConfig` | No | Optional theme overrides for planner colors and typography. |

## Data Types

These are the public data types exported by the package:

```ts
import type {
  SolarPlannerProps,
  SolarPlannerData,
  ThemeConfig,
  GeoPosition,
  Rectangle3D,
  Chimney3D,
  Tree3D,
  SolarPanelConfig,
  Lot3D,
  PanelReportRow,
} from "@sherifzayed/solar-panels";
```

### `SolarPlannerData`

The shape of both `initialData` and the `onSave` payload:

```ts
interface SolarPlannerData {
  rectangles: Rectangle3D[];
  solarPanelConfigs: SolarPanelConfig[];
  chimneys: Chimney3D[];
  trees: Tree3D[];
  lots: Lot3D[];
  mapCenter: GeoPosition;
  mapZoom: number;
  panelReport: PanelReportRow[];
  maxCapacityWatts: number;
}
```

### `SolarPlannerProps`

```ts
interface SolarPlannerProps {
  googleMapsApiKey: string;
  solarApiBaseUrl?: string;
  solarApiHeaders?: HeadersInit;
  defaultCenter?: GeoPosition;
  defaultZoom?: number;
  initialData?: Partial<SolarPlannerData>;
  onSave?: (data: SolarPlannerData) => void;
  dailyEnergyTargetKwh?: number;
  maxCapacityWatts?: number;
  theme?: ThemeConfig;
}
```

### `Rectangle3D`

Represents a building / roof section:

```ts
interface Rectangle3D {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  depth: number;
  polygonFootprint?: [number, number, number][];
  color: string;
  mergeStart?: MergeConnection;
  mergeEnd?: MergeConnection;
  startCap: EndCapType;
  endCap: EndCapType;
  roofType: RoofType;
  shedDirection?: ShedDirection;
  wallHeight: number;
  pitchAngle: number;
}

interface MergeConnection {
  rectId: string;
  handle: "start" | "end" | "midpoint";
  t?: number;
}

type EndCapType = "flat" | "pointed";
type RoofType = "flat" | "hip" | "shed" | "gambrel";
type ShedDirection = "left" | "right";
```

### `SolarPanelConfig`

```ts
interface SolarPanelConfig {
  roofSideKey: string;
  panelWidth: number;
  panelHeight: number;
  panelCount: number;
  layoutMode?: "generated" | "manual";
  manualPanels?: ManualPanel2D[];
  columnSpacing?: number;
  rotationAngle?: number;
  standHeight?: number;
  rowSpacing?: number;
  inclinationAngle?: number;
}

interface ManualPanel2D {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}
```

### `Lot3D`

```ts
interface Lot3D {
  id: string;
  corner1: [number, number, number];
  corner2: [number, number, number];
  polygonFootprint?: [number, number, number][];
  color: string;
}
```

### `Chimney3D`

```ts
interface Chimney3D {
  id: string;
  rectangleId: string;
  shape: ChimneyShape;
  localX: number;
  localZ: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

type ChimneyShape = "rectangular" | "circular";
```

### `Tree3D`

```ts
interface Tree3D {
  id: string;
  position: [number, number, number];
  radius: number;
  height: number;
  color: string;
}
```

### `PanelReportRow`

```ts
interface PanelReportRow {
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
```

### `GeoPosition`

```ts
interface GeoPosition {
  lat: number;
  lng: number;
}
```

### `ThemeConfig`

```ts
interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
}
```
