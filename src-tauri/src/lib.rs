use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

mod config;

#[tauri::command]
fn start_changing_styles(app: AppHandle) {
    let window_reader = get_reader_window(&app);

    window_reader
        .emit("start-changing-styles", ())
        .expect("Cannot emit start-changing-styles");

    window_reader
        .set_ignore_cursor_events(false)
        .expect("Cannot un-ignore cursor events");
}

#[tauri::command]
fn end_changing_styles(app: AppHandle) {
    end_changing_styles_aux(&app);
}

fn end_changing_styles_aux(app: &AppHandle) {
    let window_reader = get_reader_window(&app);

    window_reader
        .emit("end-changing-styles", ())
        .expect("Cannot emit end-changing-styles");

    window_reader
        .set_ignore_cursor_events(true)
        .expect("Cannot ignore cursor events");
}

#[tauri::command]
fn persist_position_size(app: AppHandle) {
    persist_position_size_aux(&app);
}

fn persist_position_size_aux(app: &AppHandle) {
    let window_reader = get_reader_window(&app);
    let position_reader = window_reader
        .outer_position()
        .expect("Cannot get window position");
    let size_reader = window_reader.inner_size().expect("Cannot get window size");
    let scale_factor_reader = window_reader
        .scale_factor()
        .expect("Cannot get scale factor");

    let app_state = app.state::<Mutex<config::Config>>();
    let mut config = app_state.lock().unwrap();
    config.position_reader = position_reader.to_logical(scale_factor_reader);
    config.size_reader = size_reader.to_logical(scale_factor_reader);

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
        config.position_settings = position_settings.to_logical(scale_factor_settings);
        config.size_settings = size_settings.to_logical(scale_factor_settings);
    }

    config::write_config(&config);
}

fn get_reader_window(app: &AppHandle) -> WebviewWindow {
    app.get_webview_window("main")
        .expect("Cannot get main window")
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
                    .inner_size(config.size_reader.width, config.size_reader.height)
                    .position(config.position_reader.x, config.position_reader.y)
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
                        persist_position_size_aux(app);
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
            start_changing_styles,
            end_changing_styles,
            persist_position_size,
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

            let webview_url_settings = WebviewUrl::App("index-settings.html".into());
            let window_settings = WebviewWindowBuilder::new(app, "settings", webview_url_settings)
                .title("Settings")
                .inner_size(config.size_settings.width, config.size_settings.height)
                .position(config.position_settings.x, config.position_settings.y)
                .build()
                .expect("Cannot create settings window");
            window_settings
                .set_focus()
                .expect("Cannot set focus to window");

            let app = app.clone();
            window_settings.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { .. } = event {
                    end_changing_styles_aux(&app);
                    persist_position_size_aux(&app);
                }
            });
        }
    };
}
