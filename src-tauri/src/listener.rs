use crate::fsm::Fsm;
use rdev::{Button, Event, EventType, Key};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Mutex};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug)]
pub struct Listener {
    app: AppHandle,
    key_up_downs: HashMap<KeyButton, UpDown>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendListenState {
    pub name: String,
    pub allow_wheel: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendKeyButtonDownInfo {
    pub name: String,
    pub key_button: KeyButton,
}

impl Listener {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            key_up_downs: HashMap::new(),
        }
    }

    pub fn callback(&mut self, event: Event) {
        let key_button = match KeyButton::try_from(event.event_type) {
            Ok(key_button) => key_button,
            Err(()) => return,
        };

        let up_down = if matches!(
            event.event_type,
            EventType::ButtonRelease(..) | EventType::KeyRelease(..)
        ) {
            UpDown::Up
        } else {
            UpDown::Down
        };

        let original_up_down = self
            .key_up_downs
            .get(&key_button)
            .copied()
            .unwrap_or(UpDown::Up);

        let is_wheel_event = matches!(event.event_type, EventType::Wheel { .. });

        if up_down == original_up_down && !is_wheel_event {
            return;
        }

        if up_down == UpDown::Down {
            let frontend_listen_state = self.app.state::<Mutex<FrontendListenState>>();
            let mut frontend_listen_state = frontend_listen_state.lock().unwrap();
            if !frontend_listen_state.name.is_empty()
                && key_button != KeyButton::Button(Button::Left)
                && (frontend_listen_state.allow_wheel || !is_wheel_event)
            {
                let window_settings = self.app.get_webview_window("settings");
                if let Some(window_settings) = window_settings {
                    window_settings
                        .emit(
                            "key-button-down",
                            BackendKeyButtonDownInfo {
                                name: frontend_listen_state.name.clone(),
                                key_button,
                            },
                        )
                        .unwrap();
                }
                frontend_listen_state.name = String::new();
            }
        }

        self.key_up_downs.insert(key_button, up_down);
        let app_state = self.app.state::<Mutex<Fsm>>();
        let mut fsm = app_state.lock().unwrap();
        fsm.try_next_state(key_button, up_down, &self.app);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum KeyButton {
    Key(Key),

    Button(Button),

    WheelUp,
    WheelDown,
}

impl TryFrom<EventType> for KeyButton {
    type Error = ();

    #[cfg(not(feature = "trial"))]
    fn try_from(value: EventType) -> Result<Self, Self::Error> {
        match value {
            EventType::KeyPress(key) | EventType::KeyRelease(key) => {
                if key == Key::Escape {
                    Err(())
                } else {
                    Ok(Self::Key(key))
                }
            }
            EventType::ButtonPress(button) | EventType::ButtonRelease(button) => {
                Ok(Self::Button(button))
            }
            EventType::Wheel {
                delta_x: _,
                delta_y,
            } => match delta_y {
                1.. => Ok(Self::WheelUp),
                ..=-1 => Ok(Self::WheelDown),
                0 => Err(()),
            },
            EventType::MouseMove { .. } => Err(()),
        }
    }

    #[cfg(feature = "trial")]
    fn try_from(value: EventType) -> Result<Self, Self::Error> {
        match value {
            EventType::KeyPress(key) | EventType::KeyRelease(key) => match key {
                Key::ControlLeft | Key::Alt | Key::ShiftLeft => Ok(Self::Key(key)),
                _ => Err(()),
            },
            EventType::ButtonPress(button) | EventType::ButtonRelease(button) => match button {
                Button::Left => Ok(Self::Button(button)),
                _ => Err(()),
            },
            EventType::Wheel {
                delta_x: _,
                delta_y,
            } => match delta_y {
                ..=-1 => Ok(Self::WheelDown),
                _ => Err(()),
            },
            EventType::MouseMove { .. } => Err(()),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpDown {
    Up,
    Down,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyButtonAction(pub KeyButton, pub UpDown);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn examine_key_button_serialization_format() {
        println!(
            "{}",
            serde_json::to_string(&KeyButton::Key(Key::Escape)).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&KeyButton::Key(Key::Unknown(42))).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&KeyButton::Key(Key::RawKey(
                rdev::RawKey::WinVirtualKeycode(43)
            )))
            .unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&KeyButton::Button(Button::Left)).unwrap()
        );
        println!(
            "{}",
            serde_json::to_string(&KeyButton::Button(Button::Unknown(44))).unwrap()
        );
        println!("{}", serde_json::to_string(&KeyButton::WheelUp).unwrap());
    }
}
