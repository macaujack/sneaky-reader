use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl};

mod config;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let (config, is_first_start) = config::read_config();
            let window = app.get_window("main").expect("Cannot get main window");
            window
                .set_ignore_cursor_events(true)
                .expect("Cannot ignore cursor events");
            window
                .set_size(Size::Physical(PhysicalSize {
                    width: config.size.width,
                    height: config.size.height,
                }))
                .expect("Cannot set window size");
            window
                .set_position(Position::Physical(PhysicalPosition {
                    x: config.position.x,
                    y: config.position.y,
                }))
                .expect("Cannot set window position");

            if is_first_start {
                let webview_url = WebviewUrl::App("index-settings.html".into());
                tauri::WebviewWindowBuilder::new(app, "settings", webview_url)
                    .title("Settings")
                    .inner_size(1024.0, 768.0)
                    .build()
                    .unwrap();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
