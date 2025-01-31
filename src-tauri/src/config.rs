use serde::{Deserialize, Serialize};
use tauri::{LogicalPosition, LogicalSize};

pub const CONFIG_ROOT_DIR: &str = "sneaky-reader";
pub const CONFIG_FILENAME: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    pub appearance: Appearance,
    pub control: Control,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Appearance {
    pub position_reader: LogicalPosition<f64>,
    pub size_reader: LogicalSize<f64>,
    pub position_settings: LogicalPosition<f64>,
    pub size_settings: LogicalSize<f64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Clone, Copy, Default)]
pub enum ControlBasicMode {
    Simple,
    Safe,
    #[default]
    VerySafe,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlBasic {
    pub mode: ControlBasicMode,
    pub show_hide: String,
    pub next_page: String,
    pub prev_page: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Control {
    pub is_advanced: bool,
    pub basic: ControlBasic,
}

impl Default for Appearance {
    fn default() -> Self {
        Self {
            position_reader: LogicalPosition::new(80.0, 60.0),
            size_reader: LogicalSize::new(800.0, 600.0),
            position_settings: LogicalPosition::new(900.0, 150.0),
            size_settings: LogicalSize::new(800.0, 600.0),
        }
    }
}

impl Default for ControlBasic {
    fn default() -> Self {
        Self {
            mode: Default::default(),
            show_hide: String::from("ControlLeft"),
            next_page: String::from("AltLeft"),
            prev_page: String::from("ShiftLeft"),
        }
    }
}

/// Read the configuration from the config file, or create a new one if it doesn't exist.
/// Returns the configuration and a boolean indicating whether the configuration is newly created.
pub fn read_config() -> (Config, bool) {
    let config_dir = dirs::config_dir().unwrap().join(CONFIG_ROOT_DIR);
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir).unwrap();
    }

    let config_file = config_dir.join(CONFIG_FILENAME);
    if config_file.exists() {
        let file = std::fs::File::open(config_file).expect("Cannot open config file");
        let reader = std::io::BufReader::new(file);
        (
            serde_json::from_reader(reader).expect("Error parsing config file"),
            false,
        )
    } else {
        let config = Config::default();
        write_config(&config);
        (config, true)
    }
}

pub fn write_config(config: &Config) {
    let config_dir = dirs::config_dir().unwrap().join(CONFIG_ROOT_DIR);
    let config_file = config_dir.join(CONFIG_FILENAME);
    let file = std::fs::File::create(&config_file).expect("Cannot write config file");
    let writer = std::io::BufWriter::new(file);
    serde_json::to_writer(writer, config).expect("Error serializing config");
}
