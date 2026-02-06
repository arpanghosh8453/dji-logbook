/**
 * Main Dashboard layout component
 * Orchestrates the flight list sidebar, charts, and map
 */

import { useState } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import { FlightList } from './FlightList';
import { FlightImporter } from './FlightImporter';
import { FlightStats } from './FlightStats';
import { SettingsModal } from './SettingsModal';
import { TelemetryCharts } from '@/components/charts/TelemetryCharts';
import { FlightMap } from '@/components/map/FlightMap';

export function Dashboard() {
  const { currentFlightData, isLoading, flights } = useFlightStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Left Sidebar - Flight List */}
      <aside className="w-72 bg-dji-secondary border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <svg
                className="w-6 h-6 text-dji-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3l14 9-14 9V3z"
                />
              </svg>
              DJI Log Viewer
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Flight Analysis Dashboard
            </p>
          </div>
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Flight Importer */}
        <div className="p-4 border-b border-gray-700">
          <FlightImporter />
        </div>

        {/* Flight List */}
        <div className="flex-1 overflow-y-auto">
          <FlightList />
        </div>

        {/* Flight Count */}
        <div className="p-3 border-t border-gray-700 text-center">
          <span className="text-xs text-gray-400">
            {flights.length} flight{flights.length !== 1 ? 's' : ''} imported
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-dji-primary border-t-transparent rounded-full spinner" />
              <p className="text-gray-400">Loading flight data...</p>
            </div>
          </div>
        ) : currentFlightData ? (
          <>
            {/* Stats Bar */}
            <FlightStats data={currentFlightData} />

            {/* Charts and Map Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
              {/* Telemetry Charts */}
              <div className="card overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-700">
                  <h2 className="font-semibold text-white">
                    Telemetry Data
                  </h2>
                </div>
                <div className="flex-1 p-2 overflow-auto">
                  <TelemetryCharts data={currentFlightData.telemetry} />
                </div>
              </div>

              {/* Flight Map */}
              <div className="card overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-700">
                  <h2 className="font-semibold text-white">Flight Path</h2>
                </div>
                <div className="flex-1">
                  <FlightMap track={currentFlightData.track} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 mx-auto mb-6 text-gray-600">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                No Flight Selected
              </h2>
              <p className="text-gray-500">
                Import a DJI flight log or select an existing flight from the
                sidebar to view telemetry data and flight path.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
