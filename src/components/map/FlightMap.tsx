/**
 * Flight map component using react-map-gl with MapLibre
 * Displays the GPS track of the selected flight
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, Marker } from 'react-map-gl/maplibre';
import type { LineLayer, CircleLayer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getTrackCenter, calculateBounds } from '@/lib/utils';

interface FlightMapProps {
  track: [number, number, number][]; // [lng, lat, alt][]
}

// Free MapTiler style - you can replace with your own API key
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function FlightMap({ track }: FlightMapProps) {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 14,
    pitch: 45,
    bearing: 0,
  });

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

  // Convert track to GeoJSON
  const trackGeoJSON = useMemo(() => {
    if (track.length === 0) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: track,
      },
    };
  }, [track]);

  // Start and end markers
  const startPoint = track[0];
  const endPoint = track[track.length - 1];

  // Layer styles
  const trackLayerStyle: LineLayer = {
    id: 'flight-track',
    type: 'line',
    paint: {
      'line-color': '#00A0DC',
      'line-width': 3,
      'line-opacity': 0.8,
    },
  };

  const handleMove = useCallback(
    (evt: { viewState: typeof viewState }) => {
      setViewState(evt.viewState);
    },
    []
  );

  if (track.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-dji-dark">
        <p className="text-gray-500">No GPS data available</p>
      </div>
    );
  }

  return (
    <Map
      {...viewState}
      onMove={handleMove}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      attributionControl={false}
    >
      <NavigationControl position="top-right" />

      {/* Flight Track */}
      {trackGeoJSON && (
        <Source id="flight-track" type="geojson" data={trackGeoJSON}>
          <Layer {...trackLayerStyle} />
        </Source>
      )}

      {/* Start Marker (Green) */}
      {startPoint && (
        <Marker longitude={startPoint[0]} latitude={startPoint[1]} anchor="center">
          <div className="relative">
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg" />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
              Start
            </div>
          </div>
        </Marker>
      )}

      {/* End Marker (Red) */}
      {endPoint && (
        <Marker longitude={endPoint[0]} latitude={endPoint[1]} anchor="center">
          <div className="relative">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg" />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
              End
            </div>
          </div>
        </Marker>
      )}
    </Map>
  );
}
