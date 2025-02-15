use crate::fsm::Fsm;
use rdev::{Button, Event, EventType, Key};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug)]
pub struct Listener {
    app: AppHandle,
    key_up_downs: Vec<UpDown>,
}

impl Listener {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            key_up_downs: vec![UpDown::Up; KeyButton::TheEnd as usize],
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

        if up_down == self.key_up_downs[key_button as usize]
            && !matches!(event.event_type, EventType::Wheel { .. })
        {
            return;
        }

        self.key_up_downs[key_button as usize] = up_down;
        let app_state = self.app.state::<Mutex<Fsm>>();
        let mut fsm = app_state.lock().unwrap();
        fsm.try_next_state(key_button, up_down, &self.app);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KeyButton {
    ControlLeft,
    AltLeft,
    ShiftLeft,

    MouseLeft,
    MouseMiddle,
    MouseRight,

    WheelUp,
    WheelDown,

    /// This is used to calculate the number of variants in this enum. Don't
    /// add other variants following this.
    TheEnd,
}

impl TryFrom<EventType> for KeyButton {
    type Error = ();

    fn try_from(value: EventType) -> Result<Self, Self::Error> {
        match value {
            EventType::KeyPress(key) | EventType::KeyRelease(key) => match key {
                Key::ControlLeft => Ok(Self::ControlLeft),
                Key::Alt => Ok(Self::AltLeft),
                Key::ShiftLeft => Ok(Self::ShiftLeft),
                _ => Err(()),
            },
            EventType::ButtonPress(button) | EventType::ButtonRelease(button) => match button {
                Button::Left => Ok(Self::MouseLeft),
                Button::Middle => Ok(Self::MouseMiddle),
                Button::Right => Ok(Self::MouseRight),
                Button::Unknown(_code) => Err(()),
            },
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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpDown {
    Up,
    Down,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyButtonAction(pub KeyButton, pub UpDown);
