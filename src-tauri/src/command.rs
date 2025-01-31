use super::config;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

#[tauri::command]
pub fn start_changing_styles(app: AppHandle) {
    let window_reader = get_reader_window(&app);

    window_reader
        .emit("start-changing-styles", ())
        .expect("Cannot emit start-changing-styles");

    window_reader
        .set_ignore_cursor_events(false)
        .expect("Cannot un-ignore cursor events");
}

#[tauri::command]
pub fn end_changing_styles(app: AppHandle) {
    end_changing_styles_aux(&app);
}

pub fn end_changing_styles_aux(app: &AppHandle) {
    let window_reader = get_reader_window(app);

    window_reader
        .emit("end-changing-styles", ())
        .expect("Cannot emit end-changing-styles");

    window_reader
        .set_ignore_cursor_events(true)
        .expect("Cannot ignore cursor events");
}

#[tauri::command]
pub fn persist_position_size(app: AppHandle) {
    persist_position_size_aux(&app);
}

pub fn persist_position_size_aux(app: &AppHandle) {
    let window_reader = get_reader_window(app);
    let position_reader = window_reader
        .outer_position()
        .expect("Cannot get window position");
    let size_reader = window_reader.inner_size().expect("Cannot get window size");
    let scale_factor_reader = window_reader
        .scale_factor()
        .expect("Cannot get scale factor");

    let app_state = app.state::<Mutex<config::Config>>();
    let mut config = app_state.lock().unwrap();
    let appearance = &mut config.appearance;
    appearance.position_reader = position_reader.to_logical(scale_factor_reader);
    appearance.size_reader = size_reader.to_logical(scale_factor_reader);

    if let Some(window_settings) = app.get_webview_window("settings") {
        let position_settings = window_settings
            .outer_position()
            .expect("Cannot get window position");
        let size_settings = window_settings
            .inner_size()
            .expect("Cannot get window size");

        let scale_factor_settings = window_settings
            .scale_factor()
            .expect("Cannot get scale factor");
        appearance.position_settings = position_settings.to_logical(scale_factor_settings);
        appearance.size_settings = size_settings.to_logical(scale_factor_settings);
    }

    config::write_config(&config);
}

#[tauri::command]
pub fn persist_basic_control(app: AppHandle, key: String, value: String) {
    let app_state = app.state::<Mutex<config::Config>>();
    let mut config = app_state.lock().unwrap();
    config.control.is_advanced = false;
    let basic_control = &mut config.control.basic;

    if key == "mode" {
        let mode: config::ControlBasicMode = serde_json::from_str(&format!("\"{value}\""))
            .expect("Cannot deserialize value to mode");
        basic_control.mode = mode;
    } else {
        let field = match key.as_str() {
            "show_hide" => &mut basic_control.show_hide,
            "next_page" => &mut basic_control.next_page,
            "prev_page" => &mut basic_control.prev_page,
            _ => panic!("Unknown key"),
        };
        *field = value;
    }

    config::write_config(&config);
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> config::Config {
    let app_state = app.state::<Mutex<config::Config>>();
    let config = app_state.lock().unwrap();
    config.clone()
}

fn get_reader_window(app: &AppHandle) -> WebviewWindow {
    app.get_webview_window("main")
        .expect("Cannot get main window")
}
