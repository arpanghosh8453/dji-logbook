//! DJI Flight Log Viewer - Tauri Backend
//!
//! A high-performance desktop application for analyzing DJI drone flight logs.
//! Built with Tauri v2, DuckDB, and React.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod database;
mod models;
mod parser;

use std::path::PathBuf;
use std::sync::Arc;

use tauri::{AppHandle, Manager, State};

use database::{Database, DatabaseError};
use models::{Flight, FlightDataResponse, ImportResult, TelemetryData};
use parser::LogParser;
use api::DjiApi;

/// Application state containing the database connection
pub struct AppState {
    pub db: Arc<Database>,
}

/// Get the app data directory for storing the database and logs
fn app_data_dir_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

/// Initialize the database in the app data directory
fn init_database(app: &AppHandle) -> Result<Database, String> {
    let data_dir = app_data_dir_path(app)?;
    log::info!("Initializing database in: {:?}", data_dir);

    Database::new(data_dir).map_err(|e| format!("Failed to initialize database: {}", e))
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Import a DJI flight log file
///
/// This command:
/// 1. Copies the file to the app's raw_logs directory
/// 2. Parses the log file (handling V13+ encryption if needed)
/// 3. Bulk inserts telemetry data into DuckDB
/// 4. Returns the new flight ID
#[tauri::command]
async fn import_log(file_path: String, state: State<'_, AppState>) -> Result<ImportResult, String> {
    log::info!("Importing log file: {}", file_path);

    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Ok(ImportResult {
            success: false,
            flight_id: None,
            message: "File not found".to_string(),
            point_count: 0,
        });
    }

    // Create parser instance
    let parser = LogParser::new(&state.db);

    // Archive the original file
    if let Err(e) = parser.archive_log_file(&path) {
        log::warn!("Failed to archive log file: {}", e);
    }

    // Parse the log file
    let parse_result = match parser.parse_log(&path).await {
        Ok(result) => result,
        Err(parser::ParserError::AlreadyImported) => {
            return Ok(ImportResult {
                success: false,
                flight_id: None,
                message: "This flight log has already been imported".to_string(),
                point_count: 0,
            });
        }
        Err(e) => {
            return Ok(ImportResult {
                success: false,
                flight_id: None,
                message: format!("Failed to parse log: {}", e),
                point_count: 0,
            });
        }
    };

    // Insert flight metadata
    let flight_id = state
        .db
        .insert_flight(&parse_result.metadata)
        .map_err(|e| format!("Failed to insert flight: {}", e))?;

    // Bulk insert telemetry data
    let point_count = state
        .db
        .bulk_insert_telemetry(flight_id, &parse_result.points)
        .map_err(|e| format!("Failed to insert telemetry: {}", e))?;

    log::info!(
        "Successfully imported flight {} with {} points",
        flight_id,
        point_count
    );

    Ok(ImportResult {
        success: true,
        flight_id: Some(flight_id),
        message: format!(
            "Successfully imported {} telemetry points",
            point_count
        ),
        point_count,
    })
}

/// Get all flights for the sidebar list
#[tauri::command]
async fn get_flights(state: State<'_, AppState>) -> Result<Vec<Flight>, String> {
    state
        .db
        .get_all_flights()
        .map_err(|e| format!("Failed to get flights: {}", e))
}

/// Get complete flight data for visualization
///
/// This command:
/// 1. Retrieves flight metadata
/// 2. Fetches telemetry with automatic downsampling for large datasets
/// 3. Returns data optimized for ECharts consumption
#[tauri::command]
async fn get_flight_data(
    flight_id: i64,
    max_points: Option<usize>,
    state: State<'_, AppState>,
) -> Result<FlightDataResponse, String> {
    log::debug!("Fetching flight data for ID: {}", flight_id);

    // Get flight metadata
    let flights = state
        .db
        .get_all_flights()
        .map_err(|e| format!("Failed to get flights: {}", e))?;

    let flight = flights
        .into_iter()
        .find(|f| f.id == flight_id)
        .ok_or_else(|| format!("Flight {} not found", flight_id))?;

    // Get telemetry with automatic downsampling
    let telemetry_records = state
        .db
        .get_flight_telemetry(flight_id, max_points)
        .map_err(|e| match e {
            DatabaseError::FlightNotFound(id) => format!("Flight {} not found", id),
            _ => format!("Failed to get telemetry: {}", e),
        })?;

    // Convert to ECharts-optimized format
    let telemetry = TelemetryData::from_records(&telemetry_records);

    // Get GPS track for map
    let track = state
        .db
        .get_flight_track(flight_id, Some(2000))
        .map_err(|e| format!("Failed to get track: {}", e))?;

    Ok(FlightDataResponse {
        flight,
        telemetry,
        track,
    })
}

/// Delete a flight and all its telemetry data
#[tauri::command]
async fn delete_flight(flight_id: i64, state: State<'_, AppState>) -> Result<bool, String> {
    state
        .db
        .delete_flight(flight_id)
        .map(|_| true)
        .map_err(|e| format!("Failed to delete flight: {}", e))
}

/// Get the raw_logs directory path for the frontend
#[tauri::command]
async fn get_raw_logs_dir(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.db.raw_logs_dir().to_string_lossy().to_string())
}

/// Check if DJI API key is configured
#[tauri::command]
async fn has_api_key(state: State<'_, AppState>) -> Result<bool, String> {
    let api = DjiApi::with_app_data_dir(state.db.data_dir.clone());
    Ok(api.has_api_key())
}

/// Set the DJI API key (saves to config.json in app data directory)
#[tauri::command]
async fn set_api_key(api_key: String, state: State<'_, AppState>) -> Result<bool, String> {
    let api = DjiApi::with_app_data_dir(state.db.data_dir.clone());
    api.save_api_key(&api_key)
        .map(|_| true)
        .map_err(|e| format!("Failed to save API key: {}", e))
}

/// Get the app data directory path
#[tauri::command]
async fn get_app_data_dir(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.db.data_dir.to_string_lossy().to_string())
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Initialize database on app startup
            let db = init_database(app.handle())?;

            // Store in app state
            app.manage(AppState { db: Arc::new(db) });

            log::info!("DJI Log Viewer initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_log,
            get_flights,
            get_flight_data,
            delete_flight,
            get_raw_logs_dir,
            has_api_key,
            set_api_key,
            get_app_data_dir,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run DJI Log Viewer");
}

fn main() {
    run();
}
