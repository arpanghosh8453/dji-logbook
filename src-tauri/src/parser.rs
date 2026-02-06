//! Parser module for DJI flight log files.
//!
//! Handles:
//! - Parsing various DJI log formats using dji-log-parser
//! - Extracting telemetry data points
//! - File hash calculation for duplicate detection
//! - V13+ encrypted log handling with API key fetching

use std::fs::{self, File};
use std::io::{BufReader, Read};
use std::path::Path;

use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use thiserror::Error;

use dji_log_parser::frame::Frame;
use dji_log_parser::DJILog;

use crate::api::DjiApi;
use crate::database::Database;
use crate::models::{FlightMetadata, FlightStats, TelemetryPoint};

#[derive(Error, Debug)]
pub enum ParserError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("File already imported")]
    AlreadyImported,

    #[error("No valid telemetry data found")]
    NoTelemetryData,

    #[error("Encryption key required for V13+ logs")]
    EncryptionKeyRequired,

    #[error("API error: {0}")]
    Api(String),
}

/// Result of parsing a DJI log file
pub struct ParseResult {
    pub metadata: FlightMetadata,
    pub points: Vec<TelemetryPoint>,
}

/// DJI Log Parser wrapper
pub struct LogParser<'a> {
    db: &'a Database,
    api: DjiApi,
}

impl<'a> LogParser<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self {
            db,
            api: DjiApi::with_app_data_dir(db.data_dir.clone()),
        }
    }

    /// Calculate SHA256 hash of a file for duplicate detection
    pub fn calculate_file_hash(path: &Path) -> Result<String, ParserError> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];

        loop {
            let bytes_read = reader.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// Copy log file to the raw_logs directory
    pub fn archive_log_file(&self, source_path: &Path) -> Result<String, ParserError> {
        let file_name = source_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.log");

        let dest_path = self.db.raw_logs_dir().join(file_name);

        // If file already exists, add timestamp suffix
        let final_path = if dest_path.exists() {
            let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
            let stem = source_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("log");
            let ext = source_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("txt");
            self.db
                .raw_logs_dir()
                .join(format!("{}_{}.{}", stem, timestamp, ext))
        } else {
            dest_path
        };

        fs::copy(source_path, &final_path)?;

        Ok(final_path.to_string_lossy().to_string())
    }

    /// Parse a DJI log file and extract all telemetry data
    pub async fn parse_log(&self, file_path: &Path) -> Result<ParseResult, ParserError> {
        log::info!("Parsing log file: {:?}", file_path);

        // Calculate file hash to check for duplicates
        let file_hash = Self::calculate_file_hash(file_path)?;

        if self
            .db
            .is_file_imported(&file_hash)
            .map_err(|e| ParserError::Parse(e.to_string()))?
        {
            return Err(ParserError::AlreadyImported);
        }

        // Read the file
        let file_data = fs::read(file_path)?;

        // Parse with dji-log-parser
        let parser = DJILog::from_bytes(file_data).map_err(|e| ParserError::Parse(e.to_string()))?;

        // Check if we need an encryption key for V13+ logs
        let frames = self.get_frames(&parser).await?;

        if frames.is_empty() {
            return Err(ParserError::NoTelemetryData);
        }

        // Extract telemetry points
        let points = self.extract_telemetry(&frames);

        if points.is_empty() {
            return Err(ParserError::NoTelemetryData);
        }

        // Calculate statistics
        let stats = self.calculate_stats(&points);

        // Build metadata
        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let metadata = FlightMetadata {
            id: self.db.generate_flight_id(),
            file_name,
            file_hash: Some(file_hash),
            drone_model: self.extract_drone_model(&parser),
            drone_serial: self.extract_serial(&parser),
            start_time: self.extract_start_time(&parser),
            end_time: self.extract_end_time(&parser),
            duration_secs: Some(stats.duration_secs),
            total_distance: Some(stats.total_distance_m),
            max_altitude: Some(stats.max_altitude_m),
            max_speed: Some(stats.max_speed_ms),
            home_lat: stats.home_location.map(|h| h[1]),
            home_lon: stats.home_location.map(|h| h[0]),
            point_count: points.len() as i32,
        };

        Ok(ParseResult { metadata, points })
    }

    /// Get frames from the parser, handling encryption if needed
    async fn get_frames(&self, parser: &DJILog) -> Result<Vec<Frame>, ParserError> {
        // Version 13+ requires keychains for decryption
        if parser.version >= 13 {
            let api_key = self.api.get_api_key().ok_or(ParserError::EncryptionKeyRequired)?;
            let keychains = parser
                .fetch_keychains(&api_key)
                .map_err(|e| ParserError::Api(e.to_string()))?;
            return parser
                .frames(Some(keychains))
                .map_err(|e| ParserError::Parse(e.to_string()));
        }

        // Pre-13 logs are unencrypted
        parser
            .frames(None)
            .map_err(|e| ParserError::Parse(e.to_string()))
    }

    /// Extract telemetry points from parsed frames
    fn extract_telemetry(&self, frames: &[Frame]) -> Vec<TelemetryPoint> {
        let mut points = Vec::with_capacity(frames.len());
        let mut timestamp_ms: i64 = 0;

        for frame in frames {
            let osd = &frame.osd;
            let gimbal = &frame.gimbal;
            let battery = &frame.battery;
            let rc = &frame.rc;

            let current_timestamp_ms = if osd.fly_time > 0.0 {
                (osd.fly_time * 1000.0) as i64
            } else {
                timestamp_ms
            };

            let mut point = TelemetryPoint {
                timestamp_ms: current_timestamp_ms,
                ..Default::default()
            };

            point.latitude = Some(osd.latitude);
            point.longitude = Some(osd.longitude);
            point.altitude = Some(osd.altitude as f64);
            point.speed = Some((osd.x_speed.powi(2) + osd.y_speed.powi(2)).sqrt() as f64);
            point.velocity_x = Some(osd.x_speed as f64);
            point.velocity_y = Some(osd.y_speed as f64);
            point.velocity_z = Some(osd.z_speed as f64);
            point.pitch = Some(osd.pitch as f64);
            point.roll = Some(osd.roll as f64);
            point.yaw = Some(osd.yaw as f64);
            point.satellites = Some(osd.gps_num as i32);
            point.gps_signal = Some(osd.gps_level as i32);
            point.flight_mode = osd.flyc_state.map(|state| format!("{:?}", state));

            point.gimbal_pitch = Some(gimbal.pitch as f64);
            point.gimbal_roll = Some(gimbal.roll as f64);
            point.gimbal_yaw = Some(gimbal.yaw as f64);

            point.battery_percent = Some(battery.charge_level as i32);
            point.battery_voltage = Some(battery.voltage as f64);

            point.rc_signal = rc.downlink_signal.or(rc.uplink_signal).map(i32::from);

            // Only add points with valid GPS data
            if point.latitude.is_some() && point.longitude.is_some() {
                points.push(point);
            }

            // Increment timestamp (frames are typically at 10Hz = 100ms intervals)
            timestamp_ms = current_timestamp_ms + 100;
        }

        points
    }

    /// Calculate flight statistics from telemetry points
    fn calculate_stats(&self, points: &[TelemetryPoint]) -> FlightStats {
        let duration_secs = points.last().map(|p| p.timestamp_ms as f64 / 1000.0).unwrap_or(0.0);

        let max_altitude = points
            .iter()
            .filter_map(|p| p.altitude)
            .fold(f64::NEG_INFINITY, f64::max);

        let max_speed = points
            .iter()
            .filter_map(|p| p.speed)
            .fold(f64::NEG_INFINITY, f64::max);

        let avg_speed: f64 = {
            let speeds: Vec<f64> = points.iter().filter_map(|p| p.speed).collect();
            if speeds.is_empty() {
                0.0
            } else {
                speeds.iter().sum::<f64>() / speeds.len() as f64
            }
        };

        let min_battery = points
            .iter()
            .filter_map(|p| p.battery_percent)
            .min()
            .unwrap_or(0);

        // Calculate total distance using haversine formula
        let total_distance = self.calculate_total_distance(points);

        // Home location is the first valid GPS point
        let home_location = points
            .iter()
            .find_map(|p| match (p.longitude, p.latitude) {
                (Some(lon), Some(lat)) => Some([lon, lat]),
                _ => None,
            });

        FlightStats {
            duration_secs,
            total_distance_m: total_distance,
            max_altitude_m: if max_altitude.is_finite() {
                max_altitude
            } else {
                0.0
            },
            max_speed_ms: if max_speed.is_finite() { max_speed } else { 0.0 },
            avg_speed_ms: avg_speed,
            min_battery,
            home_location,
        }
    }

    /// Calculate total distance traveled using haversine formula
    fn calculate_total_distance(&self, points: &[TelemetryPoint]) -> f64 {
        let mut total = 0.0;
        let mut prev_lat: Option<f64> = None;
        let mut prev_lon: Option<f64> = None;

        for point in points {
            if let (Some(lat), Some(lon)) = (point.latitude, point.longitude) {
                if let (Some(p_lat), Some(p_lon)) = (prev_lat, prev_lon) {
                    total += haversine_distance(p_lat, p_lon, lat, lon);
                }
                prev_lat = Some(lat);
                prev_lon = Some(lon);
            }
        }

        total
    }

    /// Extract drone model from parser metadata
    fn extract_drone_model(&self, parser: &DJILog) -> Option<String> {
        Some(format!("{:?}", parser.details.product_type))
    }

    /// Extract serial number from parser
    fn extract_serial(&self, parser: &DJILog) -> Option<String> {
        let sn = parser.details.aircraft_sn.clone();
        if sn.trim().is_empty() {
            None
        } else {
            Some(sn)
        }
    }

    /// Extract flight start time
    fn extract_start_time(&self, parser: &DJILog) -> Option<DateTime<Utc>> {
        Some(parser.details.start_time)
    }

    /// Extract flight end time
    fn extract_end_time(&self, parser: &DJILog) -> Option<DateTime<Utc>> {
        let start = self.extract_start_time(parser)?;
        let duration_ms = (parser.details.total_time * 1000.0) as i64;
        Some(start + chrono::Duration::milliseconds(duration_ms))
    }
}

/// Haversine distance calculation in meters
fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const R: f64 = 6_371_000.0; // Earth's radius in meters

    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let delta_lat = (lat2 - lat1).to_radians();
    let delta_lon = (lon2 - lon1).to_radians();

    let a = (delta_lat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (delta_lon / 2.0).sin().powi(2);

    let c = 2.0 * a.sqrt().asin();

    R * c
}
