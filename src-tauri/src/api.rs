//! DJI API module for fetching encryption keys for V13+ log files.
//!
//! DJI logs from firmware V13+ are encrypted and require an API key
//! to decrypt the flight data.
//!
//! The API key can be provided via:
//! 1. Environment variable: DJI_API_KEY
//! 2. Config file in app data directory: config.json
//! 3. .env file in the project root (development)

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Global API key cache
static API_KEY: OnceLock<Option<String>> = OnceLock::new();

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("API returned error: {0}")]
    ApiResponse(String),

    #[error("DJI API key not configured. Set DJI_API_KEY environment variable or add to config.json")]
    ApiKeyNotConfigured,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Configuration file structure
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub dji_api_key: Option<String>,
}

/// DJI API client for key fetching
pub struct DjiApi {
    app_data_dir: Option<PathBuf>,
}

impl DjiApi {
    /// Create a new DJI API client
    pub fn new() -> Self {
        Self {
            app_data_dir: None,
        }
    }

    /// Create a new DJI API client with app data directory for config storage
    pub fn with_app_data_dir(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir: Some(app_data_dir),
        }
    }

    /// Get the DJI API key from various sources (cached)
    ///
    /// Priority:
    /// 1. Environment variable DJI_API_KEY
    /// 2. Config file in app data directory
    /// 3. .env file (for development)
    pub fn get_api_key(&self) -> Option<String> {
        API_KEY
            .get_or_init(|| {
                // 1. Check environment variable
                if let Ok(key) = std::env::var("DJI_API_KEY") {
                    if !key.is_empty() && key != "your_api_key_here" {
                        log::info!("Using DJI API key from environment variable");
                        return Some(key);
                    }
                }

                // 2. Check config file in app data directory
                if let Some(ref app_dir) = self.app_data_dir {
                    let config_path = app_dir.join("config.json");
                    if config_path.exists() {
                        if let Ok(content) = fs::read_to_string(&config_path) {
                            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                                if let Some(key) = config.dji_api_key {
                                    if !key.is_empty() {
                                        log::info!("Using DJI API key from config.json");
                                        return Some(key);
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. Try loading .env file (development)
                if let Ok(content) = fs::read_to_string(".env") {
                    for line in content.lines() {
                        if let Some(key_value) = line.strip_prefix("DJI_API_KEY=") {
                            let key = key_value.trim().trim_matches('"').trim_matches('\'');
                            if !key.is_empty() && key != "your_api_key_here" {
                                log::info!("Using DJI API key from .env file");
                                return Some(key.to_string());
                            }
                        }
                    }
                }

                log::warn!("No DJI API key configured");
                None
            })
            .clone()
    }

    /// Check if an API key is configured
    pub fn has_api_key(&self) -> bool {
        self.get_api_key().is_some()
    }

    /// Save the API key to the config file
    pub fn save_api_key(&self, api_key: &str) -> Result<(), ApiError> {
        let app_dir = self
            .app_data_dir
            .as_ref()
            .ok_or(ApiError::ApiKeyNotConfigured)?;

        let config_path = app_dir.join("config.json");

        // Load existing config or create new
        let mut config = if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        config.dji_api_key = Some(api_key.to_string());

        let content = serde_json::to_string_pretty(&config)
            .map_err(|e| ApiError::ApiResponse(e.to_string()))?;

        fs::write(&config_path, content)?;

        log::info!("Saved DJI API key to config.json");
        Ok(())
    }

}

impl Default for DjiApi {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_serialization() {
        let config = AppConfig {
            dji_api_key: Some("test_key".to_string()),
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("test_key"));

        let parsed: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.dji_api_key, Some("test_key".to_string()));
    }
}
