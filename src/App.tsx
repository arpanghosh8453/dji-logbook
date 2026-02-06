import { useEffect } from 'react';
import { useFlightStore } from '@/stores/flightStore';
import { Dashboard } from '@/components/dashboard/Dashboard';

function App() {
  const { loadFlights, error, clearError } = useFlightStore();

  // Load flights on mount
  useEffect(() => {
    loadFlights();
  }, [loadFlights]);

  return (
    <div className="w-full h-full bg-dji-dark">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
          <span className="text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Dashboard */}
      <Dashboard />
    </div>
  );
}

export default App;
