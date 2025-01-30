use serde::{Deserialize, Serialize};
use tauri::{PhysicalPosition, PhysicalSize};

pub const CONFIG_ROOT_DIR: &str = "sneaky-reader";
pub const CONFIG_FILENAME: &str = "config.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub position: PhysicalPosition<i32>,
    pub size: PhysicalSize<u32>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            position: PhysicalPosition::new(0, 0),
            size: PhysicalSize::new(1200, 900),
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
