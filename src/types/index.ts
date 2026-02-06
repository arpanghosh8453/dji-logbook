/**
 * TypeScript interfaces matching Rust models
 * These are the data shapes exchanged via Tauri IPC
 */

/** Flight metadata for list display */
export interface Flight {
  id: number;
  fileName: string;
  droneModel: string | null;
  droneSerial: string | null;
  startTime: string | null;
  durationSecs: number | null;
  totalDistance: number | null;
  maxAltitude: number | null;
  maxSpeed: number | null;
  pointCount: number | null;
}

/** Telemetry data formatted for ECharts */
export interface TelemetryData {
  /** Time in seconds from flight start */
  time: number[];
  altitude: (number | null)[];
  speed: (number | null)[];
  battery: (number | null)[];
  satellites: (number | null)[];
  pitch: (number | null)[];
  roll: (number | null)[];
  yaw: (number | null)[];
}

/** Complete flight data response from backend */
export interface FlightDataResponse {
  flight: Flight;
  telemetry: TelemetryData;
  /** GPS track: [lng, lat, alt][] */
  track: [number, number, number][];
}

/** Result from import_log command */
export interface ImportResult {
  success: boolean;
  flightId: number | null;
  message: string;
  pointCount: number;
}

/** Flight statistics */
export interface FlightStats {
  durationSecs: number;
  totalDistanceM: number;
  maxAltitudeM: number;
  maxSpeedMs: number;
  avgSpeedMs: number;
  minBattery: number;
  homeLocation: [number, number] | null;
}

/** Chart series configuration */
export interface ChartSeries {
  name: string;
  data: (number | null)[];
  color: string;
  unit: string;
  visible: boolean;
}

/** Map viewport state */
export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}
