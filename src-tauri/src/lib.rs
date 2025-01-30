use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
};

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

            let webview_url_reader = WebviewUrl::App("index.html".into());
            let window_reader = tauri::WebviewWindowBuilder::new(app, "main", webview_url_reader)
                .title("Sneaky Reader")
                .decorations(false)
                .shadow(false)
                .transparent(true)
                .always_on_top(true)
                .build()
                .unwrap();

            window_reader
                .set_ignore_cursor_events(true)
                .expect("Cannot ignore cursor events");
            window_reader
                .set_size(Size::Physical(PhysicalSize {
                    width: config.size.width,
                    height: config.size.height,
                }))
                .expect("Cannot set window size");
            window_reader
                .set_position(Position::Physical(PhysicalPosition {
                    x: config.position.x,
                    y: config.position.y,
                }))
                .expect("Cannot set window position");

            if is_first_start {
                let webview_url_settings = WebviewUrl::App("index-settings.html".into());
                tauri::WebviewWindowBuilder::new(app, "settings", webview_url_settings)
                    .title("Settings")
                    .inner_size(1024.0, 768.0)
                    .build()
                    .unwrap();
            }

            // Create the tray icon
            // TODO: Add an icon
            let menu_item_laugh =
                MenuItem::with_id(app, "laugh", "Laugh", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&menu_item_laugh]).expect("Cannot create menu");
            let mut tray_builder =
                TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(|_app, event| match event.id.as_ref() {
                        // TODO: Handle more menu items
                        "laugh" => {
                            println!("HAHAHA");
                        }
                        _ => {}
                    });

            #[cfg(not(target_os = "linux"))]
            {
                tray_builder = tray_builder
                    .show_menu_on_left_click(false)
                    .on_tray_icon_event(|_tray, event| match event {
                        // TODO: Handle more tray events
                        _ => unimplemented!(),
                    });
            }

            let _tray = tray_builder.build(app).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
