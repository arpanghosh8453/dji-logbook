# DJI Flight Log Viewer

A high-performance desktop application for analyzing DJI drone flight logs. Built with Tauri v2, DuckDB, and React.

## Features

- 📊 **High-Performance Analytics**: DuckDB-powered analytical queries with automatic downsampling for large datasets
- 🗺️ **Interactive Flight Maps**: View your flight path with MapLibre GL
- 📈 **Telemetry Charts**: ECharts-based visualization of altitude, speed, battery, and attitude data
- 🔐 **V13+ Log Support**: Automatic encryption key handling for newer DJI logs
- 💾 **Local-First**: All data stored locally in a single DuckDB database
- 🚀 **Cross-Platform**: Works on Windows, macOS, and Linux

## Tech Stack

### Backend (Rust)
- **Tauri v2**: Desktop application framework
- **DuckDB**: Embedded analytical database (bundled, no installation required)
- **dji-log-parser**: DJI flight log parsing library

### Frontend (React)
- **React 18 + TypeScript**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **ECharts**: Telemetry charting
- **react-map-gl + MapLibre**: Map visualization

## Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [pnpm](https://pnpm.io/) or npm

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dji-logviewer.git
cd dji-logviewer

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

## Building for Production

```bash
# Build the application
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
├── src-tauri/               # RUST BACKEND
│   ├── src/
│   │   ├── main.rs          # Entry point (Tauri commands)
│   │   ├── database.rs      # DuckDB connection & schema
│   │   ├── parser.rs        # dji-log-parser wrapper
│   │   ├── models.rs        # Data structures
│   │   └── api.rs           # DJI API key fetching
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # App configuration
│
├── src/                     # REACT FRONTEND
│   ├── components/
│   │   ├── dashboard/       # Layout components
│   │   ├── charts/          # ECharts components
│   │   └── map/             # MapLibre components
│   ├── stores/              # Zustand state
│   ├── types/               # TypeScript interfaces
│   └── lib/                 # Utilities
│
└── [App Data Directory]     # RUNTIME DATA
    ├── flights.db           # DuckDB database
    ├── raw_logs/            # Original log files
    └── keychains/           # Cached decryption keys
```

## Database Schema

### flights table
- Flight metadata (drone model, duration, statistics)
- Optimized with indexes for date-based queries

### telemetry table
- Time-series telemetry data
- Composite primary key (flight_id, timestamp_ms) for efficient range queries
- Automatic downsampling for large flights (>5000 points)

## Usage

1. **Import a Flight Log**: Click "Browse Files" or drag-and-drop a DJI log file
2. **Select a Flight**: Click on a flight in the sidebar
3. **Analyze Data**: View telemetry charts and flight path on the map

## Supported Log Formats

- `.txt` - DJI Go app logs
- `.dat` - DJI binary logs
- `.log` - Various DJI log formats

## Performance Optimizations

- **Bulk Inserts**: Uses DuckDB's Appender for fast data ingestion
- **Automatic Downsampling**: Long flights are downsampled to ~5000 points for visualization
- **Canvas Rendering**: ECharts uses canvas with animations disabled for smooth scrolling
- **Lazy Loading**: Flight data is loaded on-demand when selected

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [dji-log-parser](https://github.com/lvauvillier/dji-log-parser) - DJI log parsing
- [DuckDB](https://duckdb.org/) - Analytical database
- [Tauri](https://tauri.app/) - Desktop app framework
