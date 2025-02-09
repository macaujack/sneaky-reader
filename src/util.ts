import { invoke, InvokeArgs, InvokeOptions } from "@tauri-apps/api/core";

export interface Config {
  control: Control;
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

export async function invokeCommand<T = unknown>(
  cmd: string,
  args?: InvokeArgs,
  options?: InvokeOptions
): Promise<T | undefined> {
  try {
    return (await invoke(cmd, args, options)) as T;
  } catch (e) {
    console.error(e);
  }
}
