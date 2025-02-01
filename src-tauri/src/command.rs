use super::{config, fsm, listener};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

#[tauri::command]
pub fn start_changing_styles(app: AppHandle) {
    let fsm = app.state::<Mutex<fsm::Fsm>>();
    let mut fsm = fsm.lock().unwrap();
    fsm.reset_and_pause();

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
    let fsm = app.state::<Mutex<fsm::Fsm>>();
    let mut fsm = fsm.lock().unwrap();
    fsm.continue_from_pause();

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
    let config = app.state::<Mutex<config::Config>>();
    let mut config = config.lock().unwrap();
    config.control.is_advanced = false;
    let basic_control = &mut config.control.basic;

    let fsm = app.state::<Mutex<fsm::Fsm>>();
    let mut fsm = fsm.lock().unwrap();

    if key == "mode" {
        let mode: config::ControlBasicMode = serde_json::from_str(&format!("\"{value}\""))
            .expect("Cannot deserialize value to mode");
        fsm.set_show_hide_with_basic_control(mode, basic_control.show_hide);
        basic_control.mode = mode;
    } else {
        let key_button: listener::KeyButton = serde_json::from_str(&format!("\"{value}\""))
            .expect("Cannot deserialize value to KeyButton");
        match key.as_str() {
            "show_hide" => {
                fsm.set_show_hide_with_basic_control(basic_control.mode, key_button);
                basic_control.show_hide = key_button;
            }
            "next_page" => {
                fsm.set_next_page_with_basic_control(key_button);
                basic_control.next_page = key_button;
            }
            "prev_page" => {
                fsm.set_prev_page_with_basic_control(key_button);
                basic_control.prev_page = key_button;
            }
            _ => panic!("Unknown key"),
        };
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
