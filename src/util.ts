import { invoke, InvokeArgs, InvokeOptions } from "@tauri-apps/api/core";

export interface Config {
  appearance: Appearance;
  control: Control;
}

export interface Appearance {
  text_size: number;
  text_color: string;
}

export interface Control {
  is_advanced: boolean;
  basic: ControlBasic;
}

export interface ControlBasic {
  mode: string;
  show_hide: string;
  next_page: string;
  prev_page: string;
}

export interface Book {
  title: string;
  summary: string;
  total_character_count: number;
  progress: number;
  last_read_time: number;
}

export interface ReaderBookInfo {
  title: string;
  content: string;
  progress: number;
}

export interface ImportBooksResult {
  successful: Book[];
  failed: string[];
}

const promises: Promise<void>[] = [new Promise((resolve) => resolve())];

export async function invokeCommand<T = unknown>(
  cmd: string,
  args?: InvokeArgs,
  options?: InvokeOptions
): Promise<T | undefined> {
  const prevPromise = promises[promises.length - 1];
  let resolveCommand;

  promises.push(
    new Promise<void>((resolve) => {
      resolveCommand = resolve;
    })
  );

  await prevPromise;

  try {
    const ret = (await invoke(cmd, args, options)) as T;
    resolveCommand!();
    return ret;
  } catch (e) {
    console.error(e);
  }
}

export function preventBrowserDefault() {
  const preventedShortcuts = new Set(
    [
      ["F3", 0],
      ["KeyF", 1],
      ["KeyG", 1],
      ["KeyG", 3],
      ["F7", 0],
      ["KeyI", 3],
      ["F12", 0],
      ["KeyJ", 1],
      ["F5", 0],
      ["F5", 1],
      ["F5", 2],
      ["KeyR", 1],
      ["KeyR", 3],
      ["KeyU", 1],
      ["KeyO", 1],
      ["KeyP", 1],
      ["KeyP", 3],
    ].map(([a, b]) => `${a}${b}`)
  );

  document.addEventListener("keydown", (event) => {
    let modifiers = 0;
    if (event.ctrlKey || event.metaKey) {
      modifiers |= 1;
    }
    if (event.shiftKey) {
      modifiers |= 2;
    }
    if (preventedShortcuts.has(`${event.code}${modifiers}`)) {
      event.preventDefault();
    }
  });
  document.addEventListener("contextmenu", (event) => event.preventDefault());
}
