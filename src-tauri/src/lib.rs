use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

mod command;
mod config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let (config, is_first_start) = config::read_config();
            let appearance = &config.appearance;

            let webview_url_reader = WebviewUrl::App("index.html".into());
            let mut window_builder_reader =
                tauri::WebviewWindowBuilder::new(app, "main", webview_url_reader)
                    .title("Sneaky Reader")
                    .inner_size(appearance.size_reader.width, appearance.size_reader.height)
                    .position(appearance.position_reader.x, appearance.position_reader.y)
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

            app.manage(Mutex::new(config));

            #[cfg(debug_assertions)]
            {
                window_reader.open_devtools();
            }

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

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "settings" => {
                        open_or_create_settings_window(app);
                    }
                    "quit" => {
                        command::persist_position_size_aux(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click {
                        id: _,
                        position: _,
                        rect: _,
                        button,
                        button_state,
                    } = event
                    {
                        if button == MouseButton::Left && button_state == MouseButtonState::Up {
                            open_or_create_settings_window(tray.app_handle());
                        }
                    }
                });

            #[cfg(not(target_os = "linux"))]
            {
                tray_builder = tray_builder.show_menu_on_left_click(false)
            }

            let _tray = tray_builder.build(app).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            command::start_changing_styles,
            command::end_changing_styles,
            command::persist_position_size,
            command::persist_basic_control,
            command::get_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn open_or_create_settings_window(app: &AppHandle) {
    match app.get_webview_window("settings") {
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
            let app_state = app.state::<Mutex<config::Config>>();
            let config = app_state.lock().unwrap();
            let appearance = &config.appearance;

            let webview_url_settings = WebviewUrl::App("index-settings.html".into());
            let window_settings = WebviewWindowBuilder::new(app, "settings", webview_url_settings)
                .title("Settings")
                .inner_size(
                    appearance.size_settings.width,
                    appearance.size_settings.height,
                )
                .position(
                    appearance.position_settings.x,
                    appearance.position_settings.y,
                )
                .build()
                .expect("Cannot create settings window");
            window_settings
                .set_focus()
                .expect("Cannot set focus to window");

            let app = app.clone();
            window_settings.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    command::end_changing_styles_aux(&app);
                    command::persist_position_size_aux(&app);
                }
            });
        }
    };
}
