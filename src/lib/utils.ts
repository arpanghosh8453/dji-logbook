/**
 * Utility functions for formatting and calculations
 */

/** Format duration from seconds to human readable string */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/** Format distance in meters to human readable string */
export function formatDistance(meters: number | null): string {
  if (meters === null || meters === undefined) return '--';
  
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

/** Format speed from m/s to km/h */
export function formatSpeed(ms: number | null): string {
  if (ms === null || ms === undefined) return '--';
  const kmh = ms * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

/** Format altitude in meters */
export function formatAltitude(meters: number | null): string {
  if (meters === null || meters === undefined) return '--';
  return `${meters.toFixed(1)} m`;
}

/** Format date string to locale date/time */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Unknown date';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/** Format file size in bytes to human readable */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Calculate bounds for a GPS track */
export function calculateBounds(
  track: [number, number, number][]
): [[number, number], [number, number]] | null {
  if (track.length === 0) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of track) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Add padding
  const lngPad = (maxLng - minLng) * 0.1 || 0.001;
  const latPad = (maxLat - minLat) * 0.1 || 0.001;

  return [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];
}

/** Get center of a GPS track */
export function getTrackCenter(
  track: [number, number, number][]
): [number, number] {
  if (track.length === 0) return [0, 0];

  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of track) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / track.length, sumLat / track.length];
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
