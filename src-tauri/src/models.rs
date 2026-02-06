//! Data models for the DJI Log Viewer application.
//!
//! These structs are shared between Rust backend and TypeScript frontend
//! via Tauri's IPC system with serde serialization.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Flight metadata stored in the flights table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightMetadata {
    pub id: i64,
    pub file_name: String,
    pub file_hash: Option<String>,
    pub drone_model: Option<String>,
    pub drone_serial: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_secs: Option<f64>,
    pub total_distance: Option<f64>,
    pub max_altitude: Option<f64>,
    pub max_speed: Option<f64>,
    pub home_lat: Option<f64>,
    pub home_lon: Option<f64>,
    pub point_count: i32,
}

/// Flight summary for list display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Flight {
    pub id: i64,
    pub file_name: String,
    pub drone_model: Option<String>,
    pub drone_serial: Option<String>,
    pub start_time: Option<String>,
    pub duration_secs: Option<f64>,
    pub total_distance: Option<f64>,
    pub max_altitude: Option<f64>,
    pub max_speed: Option<f64>,
    pub point_count: Option<i32>,
}

/// Raw telemetry point from parser (for bulk insert)
#[derive(Debug, Clone, Default)]
pub struct TelemetryPoint {
    pub timestamp_ms: i64,

    // Position
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub altitude: Option<f64>,
    pub altitude_abs: Option<f64>,

    // Velocity
    pub speed: Option<f64>,
    pub velocity_x: Option<f64>,
    pub velocity_y: Option<f64>,
    pub velocity_z: Option<f64>,

    // Orientation
    pub pitch: Option<f64>,
    pub roll: Option<f64>,
    pub yaw: Option<f64>,

    // Gimbal
    pub gimbal_pitch: Option<f64>,
    pub gimbal_roll: Option<f64>,
    pub gimbal_yaw: Option<f64>,

    // Power
    pub battery_percent: Option<i32>,
    pub battery_voltage: Option<f64>,
    pub battery_current: Option<f64>,
    pub battery_temp: Option<f64>,

    // Status
    pub flight_mode: Option<String>,
    pub gps_signal: Option<i32>,
    pub satellites: Option<i32>,
    pub rc_signal: Option<i32>,
}

/// Telemetry record for frontend consumption (optimized for ECharts)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryRecord {
    pub timestamp_ms: i64,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub altitude: Option<f64>,
    pub speed: Option<f64>,
    pub battery_percent: Option<i32>,
    pub pitch: Option<f64>,
    pub roll: Option<f64>,
    pub yaw: Option<f64>,
    pub satellites: Option<i32>,
    pub flight_mode: Option<String>,
}

/// Response format optimized for ECharts rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightDataResponse {
    pub flight: Flight,
    pub telemetry: TelemetryData,
    pub track: Vec<[f64; 3]>, // [lng, lat, alt] for map
}

/// Telemetry data formatted for ECharts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelemetryData {
    /// Time axis in seconds from flight start
    pub time: Vec<f64>,
    /// Altitude series
    pub altitude: Vec<Option<f64>>,
    /// Speed series
    pub speed: Vec<Option<f64>>,
    /// Battery percent series
    pub battery: Vec<Option<i32>>,
    /// Number of GPS satellites
    pub satellites: Vec<Option<i32>>,
    /// Pitch angle
    pub pitch: Vec<Option<f64>>,
    /// Roll angle
    pub roll: Vec<Option<f64>>,
    /// Yaw/Heading
    pub yaw: Vec<Option<f64>>,
}

impl TelemetryData {
    /// Create TelemetryData from a vector of TelemetryRecords
    pub fn from_records(records: &[TelemetryRecord]) -> Self {
        let base_time = records.first().map(|r| r.timestamp_ms).unwrap_or(0);

        Self {
            time: records
                .iter()
                .map(|r| (r.timestamp_ms - base_time) as f64 / 1000.0)
                .collect(),
            altitude: records.iter().map(|r| r.altitude).collect(),
            speed: records.iter().map(|r| r.speed).collect(),
            battery: records.iter().map(|r| r.battery_percent).collect(),
            satellites: records.iter().map(|r| r.satellites).collect(),
            pitch: records.iter().map(|r| r.pitch).collect(),
            roll: records.iter().map(|r| r.roll).collect(),
            yaw: records.iter().map(|r| r.yaw).collect(),
        }
    }
}

/// Import result returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub success: bool,
    pub flight_id: Option<i64>,
    pub message: String,
    pub point_count: usize,
}

/// Statistics for a flight
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightStats {
    pub duration_secs: f64,
    pub total_distance_m: f64,
    pub max_altitude_m: f64,
    pub max_speed_ms: f64,
    pub avg_speed_ms: f64,
    pub min_battery: i32,
    pub home_location: Option<[f64; 2]>,
}
