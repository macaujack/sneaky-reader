use std::{collections::HashMap, sync::Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

mod command;
mod config;
mod fsm;
mod library;
mod listener;

pub const DATA_ROOT_DIR: &str = "sneaky-reader";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
    #[cfg(target_os = "windows")]
    {
        builder = builder.device_event_filter(tauri::DeviceEventFilter::Always);
    }
    builder
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // First read the config and books so that app panics at the very beginning
            let (config, is_first_start) = config::read_config();
            let books = library::get_books_from_disk();

            #[cfg(target_os = "macos")]
            {
                // TODO: Verify if this works
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Initialize FSM and global input listener
            let fsm = {
                let mut fsm = fsm::Fsm::new();
                fsm.set_with_control(&config.control);
                fsm
            };
            app.manage(Mutex::new(fsm));
            let mut listener = listener::Listener::new(app.handle().clone());
            std::thread::spawn(|| rdev::listen(move |event| listener.callback(event)));

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
            let window_reader = window_builder_reader.build().unwrap();

            window_reader
                .set_ignore_cursor_events(true)
                .expect("Cannot ignore cursor events");

            let window_reader_clone = window_reader.clone();
            window_reader.on_window_event(move |event| {
                if let WindowEvent::Resized(_) = event {
                    window_reader_clone
                        .emit("refresh-content", ())
                        .expect("Cannot emit refresh-content");
                }
            });

            app.manage(Mutex::new(config));

            #[cfg(debug_assertions)]
            {
                window_reader.open_devtools();
            }

            let mut title_to_index = HashMap::new();
            for (i, book) in books.iter().enumerate() {
                title_to_index.insert(book.title.clone(), i);
            }
            let old_progress = books
                .first()
                .map(|book| book.progress)
                .unwrap_or(usize::MAX);
            app.manage(Mutex::new(library::BooksAux {
                books,
                title_to_index,
                old_progress,
            }));

            {
                let app = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
                    loop {
                        interval.tick().await;

                        let books_aux = app.state::<Mutex<library::BooksAux>>();
                        let mut books_aux = books_aux.lock().unwrap();
                        if books_aux.books[0].progress != books_aux.old_progress {
                            library::write_books_to_disk(&books_aux.books);
                            books_aux.old_progress = books_aux.books[0].progress;
                        }
                    }
                });
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
                        command::persist_appearance_aux(app);

                        let books_aux = app.state::<Mutex<library::BooksAux>>();
                        let books_aux = books_aux.lock().unwrap();
                        library::write_books_to_disk(&books_aux.books);

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
            command::persist_appearance,
            command::persist_basic_control,
            command::get_config,
            command::get_books,
            command::change_book,
            command::get_first_reader_book_info,
            command::update_progress,
            command::import_books,
            command::update_text_size,
            command::update_text_color,
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
                .title("")
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
                    command::persist_appearance_aux(&app);
                }
            });

            #[cfg(debug_assertions)]
            {
                window_settings.open_devtools();
            }
        }
    };
}
