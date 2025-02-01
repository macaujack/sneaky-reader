use std::time::SystemTime;

use super::listener::{KeyButton, KeyButtonAction, UpDown};
use crate::config::{Control, ControlBasicMode};
use tauri::{AppHandle, Emitter, Manager};

const COMBO_DURATION: u128 = 250;
const EVENT_SHOW: &str = "show";
const EVENT_HIDE: &str = "hide";
const EVENT_NEXT_PAGE: &str = "next-page";
const EVENT_PREV_PAGE: &str = "prev-page";

#[derive(Debug, Clone, Copy, Default)]
enum FsmState {
    #[default]
    Hide,
    ToShow(usize),
    Show,
    ToHide(usize),
    ToNextPage(usize),
    ToPrevPage(usize),
}

#[derive(Debug)]
pub struct Fsm {
    edges_show: Vec<KeyButtonAction>,
    edges_hide: Vec<KeyButtonAction>,
    edges_next: Vec<KeyButtonAction>,
    edges_prev: Vec<KeyButtonAction>,

    cur_state: FsmState,
    prev_stable_state: FsmState,

    prev_time: SystemTime,

    is_paused: bool,
}

impl Fsm {
    pub fn new() -> Self {
        Self {
            edges_show: Vec::new(),
            edges_hide: Vec::new(),
            edges_next: Vec::new(),
            edges_prev: Vec::new(),
            cur_state: FsmState::Hide,
            prev_stable_state: FsmState::Hide,
            prev_time: SystemTime::now(),
            is_paused: false,
        }
    }

    pub fn _set_edges_show(&mut self, edges_show: Vec<KeyButtonAction>) {
        self.edges_show = edges_show;
        self.cur_state = self.prev_stable_state;
    }

    pub fn _set_edges_hide(&mut self, edges_hide: Vec<KeyButtonAction>) {
        self.edges_hide = edges_hide;
        self.cur_state = self.prev_stable_state;
    }

    pub fn _set_edges_next(&mut self, edges_next: Vec<KeyButtonAction>) {
        self.edges_next = edges_next;
        self.cur_state = self.prev_stable_state;
    }

    pub fn _set_edges_prev(&mut self, edges_prev: Vec<KeyButtonAction>) {
        self.edges_prev = edges_prev;
        self.cur_state = self.prev_stable_state;
    }

    pub fn set_with_control(&mut self, control: &Control) {
        if !control.is_advanced {
            let basic = &control.basic;
            self.set_next_page_with_basic_control(basic.next_page);
            self.set_prev_page_with_basic_control(basic.prev_page);
            self.set_show_hide_with_basic_control(basic.mode, basic.show_hide);
        }

        self.cur_state = self.prev_stable_state;
    }

    pub fn set_next_page_with_basic_control(&mut self, key_button: KeyButton) {
        self.edges_next = vec![KeyButtonAction(key_button, UpDown::Down)];
    }

    pub fn set_prev_page_with_basic_control(&mut self, key_button: KeyButton) {
        self.edges_prev = vec![KeyButtonAction(key_button, UpDown::Down)];
    }

    pub fn set_show_hide_with_basic_control(
        &mut self,
        mode: ControlBasicMode,
        key_button: KeyButton,
    ) {
        use super::listener::UpDown::*;

        match mode {
            ControlBasicMode::Simple => {
                self.edges_show = vec![KeyButtonAction(key_button, Down)];
                self.edges_hide = vec![KeyButtonAction(key_button, Down)];
            }
            ControlBasicMode::Safe => {
                self.edges_show = vec![KeyButtonAction(key_button, Down)];
                self.edges_hide = vec![KeyButtonAction(key_button, Up)];
            }
            ControlBasicMode::VerySafe => {
                self.edges_show = vec![
                    KeyButtonAction(key_button, Down),
                    KeyButtonAction(key_button, Up),
                    KeyButtonAction(key_button, Down),
                ];
                self.edges_hide = vec![KeyButtonAction(key_button, Up)];
            }
        }
    }

    pub fn reset_and_pause(&mut self) {
        self.go_to_new_stable_state(FsmState::Hide);
        self.is_paused = true;
    }

    pub fn continue_from_pause(&mut self) {
        self.is_paused = false;
    }

    pub fn try_next_state(&mut self, key_button: KeyButton, up_down: UpDown, app: &AppHandle) {
        if self.is_paused {
            return;
        }

        let now = SystemTime::now();
        if matches!(
            self.cur_state,
            FsmState::ToHide(..)
                | FsmState::ToShow(..)
                | FsmState::ToNextPage(..)
                | FsmState::ToPrevPage(..)
        ) && now.duration_since(self.prev_time).unwrap().as_millis() > COMBO_DURATION
        {
            self.cur_state = self.prev_stable_state;
        }
        self.prev_time = now;

        let action = KeyButtonAction(key_button, up_down);
        match self.cur_state {
            FsmState::Hide => {
                if action != self.edges_show[0] {
                    return;
                }
                if self.edges_show.len() == 1 {
                    self.go_to_new_stable_state(FsmState::Show);
                    self.emit_event(app, EVENT_SHOW);
                } else {
                    self.cur_state = FsmState::ToShow(0);
                }
            }
            FsmState::ToShow(step) => {
                if action != self.edges_show[step + 1] {
                    self.cur_state = self.prev_stable_state;
                    return;
                }
                if self.edges_show.len() == step + 2 {
                    self.go_to_new_stable_state(FsmState::Show);
                    self.emit_event(app, EVENT_SHOW);
                } else {
                    self.cur_state = FsmState::ToShow(step + 1);
                }
            }
            FsmState::Show => {
                if action == self.edges_hide[0] {
                    if self.edges_hide.len() == 1 {
                        self.go_to_new_stable_state(FsmState::Hide);
                        self.emit_event(app, EVENT_HIDE);
                    } else {
                        self.cur_state = FsmState::ToHide(0);
                    }
                } else if action == self.edges_next[0] {
                    if self.edges_next.len() == 1 {
                        self.emit_event(app, EVENT_NEXT_PAGE);
                    } else {
                        self.cur_state = FsmState::ToNextPage(0);
                    }
                } else if action == self.edges_prev[0] {
                    if self.edges_prev.len() == 1 {
                        self.emit_event(app, EVENT_PREV_PAGE);
                    } else {
                        self.cur_state = FsmState::ToPrevPage(0);
                    }
                }
            }
            FsmState::ToHide(step) => {
                if action != self.edges_hide[step + 1] {
                    self.cur_state = self.prev_stable_state;
                    return;
                }
                if self.edges_hide.len() == step + 2 {
                    self.go_to_new_stable_state(FsmState::Hide);
                    self.emit_event(app, EVENT_HIDE);
                } else {
                    self.cur_state = FsmState::ToHide(step + 1);
                }
            }
            FsmState::ToNextPage(step) => {
                if action != self.edges_next[step + 1] {
                    self.cur_state = self.prev_stable_state;
                    return;
                }
                if self.edges_next.len() == step + 2 {
                    self.emit_event(app, EVENT_NEXT_PAGE);
                } else {
                    self.cur_state = FsmState::ToNextPage(step + 1);
                }
            }
            FsmState::ToPrevPage(step) => {
                if action != self.edges_prev[step + 1] {
                    self.cur_state = self.prev_stable_state;
                    return;
                }
                if self.edges_prev.len() == step + 2 {
                    self.emit_event(app, EVENT_PREV_PAGE);
                } else {
                    self.cur_state = FsmState::ToPrevPage(step + 1);
                }
            }
        }
    }

    fn go_to_new_stable_state(&mut self, state: FsmState) {
        self.cur_state = state;
        self.prev_stable_state = state;
    }

    fn emit_event(&self, app: &AppHandle, event: &str) {
        let window_reader = app
            .get_webview_window("main")
            .expect("Cannot get webview window");
        window_reader.emit(event, ()).expect("Cannot emit event");
    }
}
