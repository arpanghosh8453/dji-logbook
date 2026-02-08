/**
 * Flight map component using react-map-gl with MapLibre
 * Displays the GPS track of the selected flight
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Map, { NavigationControl, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { PathLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getTrackCenter, calculateBounds } from '@/lib/utils';

interface FlightMapProps {
  track: [number, number, number][]; // [lng, lat, alt][]
  homeLat?: number | null;
  homeLon?: number | null;
  themeMode: 'system' | 'dark' | 'light';
}

const MAP_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const;

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri',
    },
  },
  layers: [
    {
      id: 'satellite-base',
      type: 'raster',
      source: 'satellite',
    },
  ],
};

const TERRAIN_SOURCE_ID = 'terrain-dem';
const TERRAIN_SOURCE = {
  type: 'raster-dem',
  url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
  tileSize: 256,
  maxzoom: 14,
} as const;

const getSessionBool = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.sessionStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === 'true';
};

// ─── Catmull-Rom spline smoothing ───────────────────────────────────────────
// Interpolates between GPS points to produce a smooth, natural curve.
// `resolution` controls how many sub-points to insert between each pair (higher = smoother).
function smoothTrack(
  points: [number, number, number][],
  resolution = 4
): [number, number, number][] {
  if (points.length < 3) return points;

  const result: [number, number, number][] = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n - 1)];

    for (let step = 0; step < resolution; step++) {
      const t = step / resolution;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom coefficients
      const lng =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const lat =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      const alt =
        0.5 *
        (2 * p1[2] +
          (-p0[2] + p2[2]) * t +
          (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
          (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3);

      result.push([lng, lat, alt]);
    }
  }

  // Always include the final point
  result.push(points[n - 1]);
  return result;
}

export function FlightMap({ track, homeLat, homeLon, themeMode }: FlightMapProps) {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 14,
    pitch: 45,
    bearing: 0,
  });
  const [is3D, setIs3D] = useState(() => getSessionBool('map:is3d', true));
  const [isSatellite, setIsSatellite] = useState(() => getSessionBool('map:isSatellite', true));
  const mapRef = useRef<MapRef | null>(null);

  const resolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return themeMode;
  }, [themeMode]);

  const activeMapStyle = useMemo(
    () => (isSatellite ? SATELLITE_STYLE : MAP_STYLES[resolvedTheme]),
    [isSatellite, resolvedTheme]
  );

  // Calculate center and bounds when track changes
  useEffect(() => {
    if (track.length > 0) {
      const [lng, lat] = getTrackCenter(track);
      const bounds = calculateBounds(track);

      // Estimate zoom from bounds
      let zoom = 14;
      if (bounds) {
        const lngDiff = bounds[1][0] - bounds[0][0];
        const latDiff = bounds[1][1] - bounds[0][1];
        const maxDiff = Math.max(lngDiff, latDiff);
        zoom = Math.max(10, Math.min(18, 16 - Math.log2(maxDiff * 111)));
      }

      setViewState((prev) => ({
        ...prev,
        longitude: lng,
        latitude: lat,
        zoom,
      }));
    }
  }, [track]);

  // Smooth the raw GPS track using Catmull-Rom spline interpolation
  const smoothedTrack = useMemo(() => {
    if (track.length < 3) return track;
    // Resolution 4 = insert 4 points between each GPS sample → much smoother curves
    return smoothTrack(track, 4);
  }, [track]);

  const deckPathData = useMemo(() => {
    if (smoothedTrack.length < 2) return [];
    const segments: { path: [number, number, number][]; color: [number, number, number] }[] = [];
    const startColor: [number, number, number] = [250, 204, 21];
    const endColor: [number, number, number] = [239, 68, 68];

    const toAlt = (altitude: number) => (is3D ? altitude : 0);

    for (let i = 0; i < smoothedTrack.length - 1; i += 1) {
      const t = i / Math.max(1, smoothedTrack.length - 2);
      const color: [number, number, number] = [
        Math.round(startColor[0] + (endColor[0] - startColor[0]) * t),
        Math.round(startColor[1] + (endColor[1] - startColor[1]) * t),
        Math.round(startColor[2] + (endColor[2] - startColor[2]) * t),
      ];
      const [lng1, lat1, alt1] = smoothedTrack[i];
      const [lng2, lat2, alt2] = smoothedTrack[i + 1];
      segments.push({
        path: [
          [lng1, lat1, toAlt(alt1)],
          [lng2, lat2, toAlt(alt2)],
        ],
        color,
      });
    }

    return segments;
  }, [is3D, smoothedTrack]);

  const deckLayers = useMemo(() => {
    if (deckPathData.length === 0) return [];
    return [
      // Shadow / outline layer — wider, dark, semi-transparent, drawn first (underneath)
      new PathLayer({
        id: 'flight-path-shadow',
        data: deckPathData,
        getPath: (d) => d.path,
        getColor: [0, 0, 0, 80],
        getWidth: 10,
        widthUnits: 'pixels',
        widthMinPixels: 8,
        capRounded: true,
        jointRounded: true,
        billboard: true,
        opacity: 1,
        pickable: false,
        parameters: {
          depthTest: false,
        },
      }),
      // Main gradient path layer
      new PathLayer({
        id: 'flight-path-3d',
        data: deckPathData,
        getPath: (d) => d.path,
        getColor: (d) => d.color,
        getWidth: 4,
        widthUnits: 'pixels',
        widthMinPixels: 3,
        capRounded: true,
        jointRounded: true,
        billboard: true,
        opacity: 1,
        pickable: false,
        parameters: {
          depthTest: false,
        },
      }),
    ];
  }, [deckPathData]);

  // Start and end markers
  const startPoint = track[0];
  const endPoint = track[track.length - 1];

  const handleMapMove = useCallback(
    ({ viewState: nextViewState }: { viewState: typeof viewState }) => {
      setViewState(nextViewState);
    },
    []
  );

  const enableTerrain = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, TERRAIN_SOURCE);
    }

    if (!map.getLayer('sky')) {
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 10,
        },
      } as any);
    }

    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.4 });
  }, []);

  const disableTerrain = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setTerrain(null);
  }, []);

  useEffect(() => {
    if (is3D) {
      enableTerrain();
      setViewState((prev) => ({ ...prev, pitch: 60 }));
    } else {
      disableTerrain();
      setViewState((prev) => ({ ...prev, pitch: 0 }));
    }
  }, [disableTerrain, enableTerrain, is3D]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('map:is3d', String(is3D));
    }
  }, [is3D]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('map:isSatellite', String(isSatellite));
    }
  }, [isSatellite]);

  useEffect(() => {
    if (is3D) {
      enableTerrain();
    }
  }, [enableTerrain, is3D, resolvedTheme]);

  if (track.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-dji-dark">
        <p className="text-gray-500">No GPS data available</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-0">
      <Map
        {...viewState}
        style={{ width: '100%', height: '100%', position: 'absolute', top: '0', right: '0', bottom: '0', left: '0' }}
        mapStyle={activeMapStyle}
        attributionControl={false}
        ref={mapRef}
        onMove={handleMapMove}
        onLoad={() => {
          if (is3D) {
            enableTerrain();
          }
        }}
      >
        <NavigationControl position="top-right" />

        {/* Map Controls */}
        <div className="absolute top-2 left-2 z-10 bg-dji-dark/80 border border-gray-700 rounded-xl px-3 py-2 space-y-2 shadow-lg">
          <ToggleRow
            label="3D Terrain"
            checked={is3D}
            onChange={setIs3D}
          />
          <ToggleRow
            label="Satellite"
            checked={isSatellite}
            onChange={setIsSatellite}
          />
        </div>

        {/* Start Marker — pulsing yellow */}
        {startPoint && (
          <Marker longitude={startPoint[0]} latitude={startPoint[1]} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-7 h-7 bg-yellow-400/30 rounded-full animate-ping" />
              <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg z-10" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-yellow-500 text-black px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                START
              </div>
            </div>
          </Marker>
        )}

        {/* End Marker — red with landing icon */}
        {endPoint && (
          <Marker longitude={endPoint[0]} latitude={endPoint[1]} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 2V8M3 6L5 8L7 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                END
              </div>
            </div>
          </Marker>
        )}

        {/* Home Marker — blue crosshair */}
        {homeLat != null && homeLon != null && Math.abs(homeLat) > 0.000001 && (
          <Marker longitude={homeLon} latitude={homeLat} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-sky-400 bg-sky-400/20 flex items-center justify-center shadow-lg z-10">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6" cy="6" r="2" stroke="#38bdf8" strokeWidth="1.5" fill="none"/>
                  <line x1="6" y1="0" x2="6" y2="4" stroke="#38bdf8" strokeWidth="1"/>
                  <line x1="6" y1="8" x2="6" y2="12" stroke="#38bdf8" strokeWidth="1"/>
                  <line x1="0" y1="6" x2="4" y2="6" stroke="#38bdf8" strokeWidth="1"/>
                  <line x1="8" y1="6" x2="12" y2="6" stroke="#38bdf8" strokeWidth="1"/>
                </svg>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-sky-500 text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                HOME
              </div>
            </div>
          </Marker>
        )}
      </Map>

      <DeckGL
        viewState={viewState}
        controller={false}
        layers={deckLayers}
        style={{ width: '100%', height: '100%', pointerEvents: 'none', position: 'absolute', top: '0', right: '0', bottom: '0', left: '0' }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 text-xs text-gray-300 hover:text-white transition-colors"
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-all ${
          checked
            ? 'bg-dji-primary/90 border-dji-primary'
            : 'bg-dji-surface border-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}
