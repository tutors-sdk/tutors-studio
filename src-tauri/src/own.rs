//! OwnFilesPort's Tauri side (src/adapters/own-files/tauri/tauri-own-files.ts, ADR 0035): a folder of the
//! lecturer's own material, beside the course, that Studio only reads. The WebView opens it once, with a
//! folder the lecturer chose; every later call is a path relative to it that `fs::resolve` keeps inside.
//! Nothing here writes, moves or deletes.

use crate::fs::{list_dir, resolve, DirEntry};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

pub struct OwnState(pub Mutex<Option<PathBuf>>);

fn own_root(state: &State<OwnState>) -> Result<PathBuf, String> {
    state.0.lock().map_err(|e| e.to_string())?.clone().ok_or_else(|| "no folder of your files is open".to_string())
}

#[tauri::command]
pub fn own_open(state: State<OwnState>, root: String) -> Result<(), String> {
    let root = PathBuf::from(root).canonicalize().map_err(|e| e.to_string())?;
    if !root.is_dir() {
        return Err(format!("{}: not a folder", root.display()));
    }
    *state.0.lock().map_err(|e| e.to_string())? = Some(root);
    Ok(())
}

#[tauri::command]
pub fn own_list(state: State<OwnState>, dir: String) -> Result<Vec<DirEntry>, String> {
    list_dir(&resolve(&own_root(&state)?, &dir)?).map_err(|e| format!("{dir}: {e}"))
}

#[tauri::command]
pub fn own_read(state: State<OwnState>, path: String) -> Result<Vec<u8>, String> {
    fs::read(resolve(&own_root(&state)?, &path)?).map_err(|e| format!("{path}: {e}"))
}
