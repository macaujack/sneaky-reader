use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
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
            let mut window_builder_reader =
                tauri::WebviewWindowBuilder::new(app, "main", webview_url_reader)
                    .title("Sneaky Reader")
                    .decorations(false)
                    .shadow(false)
                    .transparent(true)
                    .always_on_top(true);
            #[cfg(not(target_os = "macos"))]
            {
                window_builder_reader = window_builder_reader.skip_taskbar(true);
            }
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
            let window_reader = window_builder_reader.build().unwrap();

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

            let open_or_create_settings_window =
                |app: &AppHandle| match app.get_webview_window("settings") {
                    Some(window_settings) => {
                        window_settings
                            .unminimize()
                            .expect("Cannot unminimize window");
                        window_settings.show().expect("Cannot show window");
                        window_settings
                            .set_focus()
                            .expect("Cannot set focus to window");
                    }
                    None => {
                        let webview_url_settings = WebviewUrl::App("index-settings.html".into());
                        WebviewWindowBuilder::new(app, "settings", webview_url_settings)
                            .title("Settings")
                            .inner_size(1024.0, 768.0)
                            .build()
                            .expect("Cannot create settings window");
                    }
                };

            if is_first_start {
                open_or_create_settings_window(app.handle());
            }

            // Create the tray icon
            // TODO: Add an icon
            let menu_item_settings =
                MenuItem::with_id(app, "settings", "Open settings", true, None::<&str>).unwrap();
            let menu_item_quit =
                MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&menu_item_settings, &menu_item_quit])
                .expect("Cannot create menu");

            let open_or_create_settings_window_clone = open_or_create_settings_window.clone();
            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "settings" => {
                        open_or_create_settings_window_clone(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(move |tray, event| match event {
                    TrayIconEvent::Click {
                        id: _,
                        position: _,
                        rect: _,
                        button,
                        button_state,
                    } => {
                        if button == MouseButton::Left && button_state == MouseButtonState::Up {
                            open_or_create_settings_window(tray.app_handle());
                        }
                    }
                    _ => {}
                });

            #[cfg(not(target_os = "linux"))]
            {
                tray_builder = tray_builder.show_menu_on_left_click(false)
            }

            let _tray = tray_builder.build(app).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
