use std::fs;
use std::path::Path;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;

fn main() {
    ensure_default_icon();
    tauri_build::build()
}

fn ensure_default_icon() {
    let icon_dir = Path::new("icons");
    let icon_path = icon_dir.join("icon.png");

    if icon_path.exists() {
        return;
    }

    if let Err(error) = fs::create_dir_all(icon_dir) {
        eprintln!("Failed to create icons directory: {}", error);
        return;
    }

    let base64_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";
    match STANDARD.decode(base64_png) {
        Ok(bytes) => {
            if let Err(error) = fs::write(&icon_path, bytes) {
                eprintln!("Failed to write default icon: {}", error);
            }
        }
        Err(error) => eprintln!("Failed to decode default icon: {}", error),
    }
}
