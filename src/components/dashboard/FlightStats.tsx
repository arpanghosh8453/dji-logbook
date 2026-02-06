/**
 * Flight statistics bar component
 * Displays key metrics for the selected flight
 */

import type { FlightDataResponse } from '@/types';
import {
  formatDuration,
  formatDistance,
  formatSpeed,
  formatAltitude,
  formatDateTime,
} from '@/lib/utils';

interface FlightStatsProps {
  data: FlightDataResponse;
}

export function FlightStats({ data }: FlightStatsProps) {
  const { flight, telemetry } = data;

  // Calculate min battery from telemetry
  const minBattery = telemetry.battery.reduce<number | null>((min, val) => {
    if (val === null) return min;
    if (min === null) return val;
    return val < min ? val : min;
  }, null);

  return (
    <div className="bg-dji-secondary border-b border-gray-700 px-4 py-3">
      {/* Flight Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {flight.droneModel || 'Unknown Drone'}
          </h2>
          <p className="text-sm text-gray-400">
            {formatDateTime(flight.startTime)}
            {flight.droneSerial && (
              <span className="ml-2 text-gray-500">
                SN: {flight.droneSerial}
              </span>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">
            {flight.pointCount?.toLocaleString() || 0} data points
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard
          label="Duration"
          value={formatDuration(flight.durationSecs)}
          icon={<ClockIcon />}
        />
        <StatCard
          label="Distance"
          value={formatDistance(flight.totalDistance)}
          icon={<DistanceIcon />}
        />
        <StatCard
          label="Max Altitude"
          value={formatAltitude(flight.maxAltitude)}
          icon={<AltitudeIcon />}
        />
        <StatCard
          label="Max Speed"
          value={formatSpeed(flight.maxSpeed)}
          icon={<SpeedIcon />}
        />
        <StatCard
          label="Min Battery"
          value={minBattery !== null ? `${minBattery}%` : '--'}
          icon={<BatteryIcon percent={minBattery} />}
          alert={minBattery !== null && minBattery < 20}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  alert?: boolean;
}

function StatCard({ label, value, icon, alert }: StatCardProps) {
  return (
    <div className="bg-dji-surface/50 rounded-lg px-3 py-2 border border-gray-700/50">
      <div className="flex items-center gap-2">
        <div className={`${alert ? 'text-red-400' : 'text-dji-primary'}`}>
          {icon}
        </div>
        <div>
          <p
            className={`text-lg font-semibold ${
              alert ? 'text-red-400' : 'text-white'
            }`}
          >
            {value}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DistanceIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

function AltitudeIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 11l5-5m0 0l5 5m-5-5v12"
      />
    </svg>
  );
}

function SpeedIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function BatteryIcon({ percent }: { percent: number | null }) {
  const fill = percent !== null ? Math.max(0, Math.min(100, percent)) : 50;
  const color =
    fill < 20 ? 'text-red-400' : fill < 50 ? 'text-yellow-400' : 'text-green-400';

  return (
    <svg className={`w-5 h-5 ${color}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 4h-3V2h-4v2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2zM7 22V6h10v16H7z" />
      <rect
        x="8"
        y={22 - (fill / 100) * 15}
        width="8"
        height={(fill / 100) * 15}
        rx="1"
      />
    </svg>
  );
}
