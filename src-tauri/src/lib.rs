use serde_json::Value;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

#[cfg(target_os = "macos")]
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

const DATA_FILE_NAME: &str = "planner-data.json";

fn data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join(DATA_FILE_NAME))
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<Value>, String> {
    let path = data_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }

    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let state = serde_json::from_str(&contents).map_err(|error| error.to_string())?;
    Ok(Some(state))
}

#[tauri::command]
fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
    let path = data_file_path(&app)?;
    let temporary_path = path.with_extension("json.tmp");
    let contents = serde_json::to_string_pretty(&state).map_err(|error| error.to_string())?;

    fs::write(&temporary_path, contents).map_err(|error| error.to_string())?;

    #[cfg(target_os = "windows")]
    if path.exists() {
        fs::remove_file(&path).map_err(|error| error.to_string())?;
    }

    fs::rename(temporary_path, path).map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn restore_main_window(app_handle: &AppHandle) {
    if let Err(error) = app_handle.show() {
        eprintln!("failed to show application: {error}");
    }

    let window = if let Some(window) = app_handle.get_webview_window("main") {
        window
    } else {
        let Some(config) = app_handle
            .config()
            .app
            .windows
            .iter()
            .find(|config| config.label == "main")
        else {
            eprintln!("main window configuration is missing");
            return;
        };

        match tauri::WebviewWindowBuilder::from_config(app_handle, config)
            .and_then(|builder| builder.build())
        {
            Ok(window) => window,
            Err(error) => {
                eprintln!("failed to recreate main window: {error}");
                return;
            }
        }
    };

    if let Err(error) = window.unminimize() {
        eprintln!("failed to unminimize main window: {error}");
    }
    if let Err(error) = window.show() {
        eprintln!("failed to show main window: {error}");
    }
    if let Err(error) = window.set_focus() {
        eprintln!("failed to focus main window: {error}");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    let keep_alive_after_main_window_close = Arc::new(AtomicBool::new(false));

    #[cfg(target_os = "macos")]
    let close_requested = Arc::clone(&keep_alive_after_main_window_close);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(move |window, event| {
            #[cfg(target_os = "macos")]
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    // Let macOS destroy the fullscreen window so its Space is cleaned up.
                    // The matching ExitRequested event is prevented below, keeping the
                    // application process alive without retaining a broken native window.
                    close_requested.store(true, Ordering::SeqCst);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![load_state, save_state])
        .build(tauri::generate_context!())
        .expect("failed to build ToT Schedule");

    app.run(move |app_handle, event| {
        #[cfg(target_os = "macos")]
        match event {
            tauri::RunEvent::ExitRequested {
                api, code: None, ..
            } if keep_alive_after_main_window_close.swap(false, Ordering::SeqCst) => {
                api.prevent_exit();
            }
            tauri::RunEvent::Reopen { .. } => {
                restore_main_window(app_handle);
            }
            _ => {}
        }
    });
}
