//! LibraryPort's Tauri side (src/adapters/library/tauri/tauri-library.ts, ADR 0061): the lecturer's library
//! folders, which Studio searches for Tutors courses. Each call names the folder it reads in, and
//! `fs::resolve` keeps every path inside it. Nothing here writes, moves or deletes.
//!
//! Every command here is async, so it runs off the main thread: a search of a large folder never holds up
//! Studio's window or the system's folder chooser (ADR 0065).

use crate::fs::{list_dir, resolve, DirEntry};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::ipc::{Channel, Response};

/// The library folder a call names, refused unless it is a folder that exists.
fn library_root(root: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(root).canonicalize().map_err(|e| format!("{root}: {e}"))?;
    if !root.is_dir() {
        return Err(format!("{}: not a folder", root.display()));
    }
    Ok(root)
}

#[tauri::command]
pub async fn library_list(root: String, dir: String) -> Result<Vec<DirEntry>, String> {
    list_dir(&resolve(&library_root(&root)?, &dir)?).map_err(|e| format!("{dir}: {e}"))
}

/// A file's bytes as they are, not as a list of numbers in JSON.
#[tauri::command]
pub async fn library_read(root: String, path: String) -> Result<Response, String> {
    read_in(&root, &path).map(Response::new)
}

fn read_in(root: &str, path: &str) -> Result<Vec<u8>, String> {
    fs::read(resolve(&library_root(root)?, path)?).map_err(|e| format!("{path}: {e}"))
}

/// How to look (LibraryLook in src/application/ports/library.ts): every value comes from the domain.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Look {
    pub depth: usize,
    pub skip: Vec<String>,
    pub skip_starts: Vec<String>,
    pub markers: Vec<String>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct Found {
    pub dir: String,
    pub marker: String,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Looked {
    pub found: Vec<Found>,
    pub looked: usize,
}

/// Folders opened and markers found so far.
#[derive(Serialize, Clone)]
pub struct Heard {
    pub looked: usize,
    pub found: usize,
}

/// How often the search says how far it has got.
const HEARD_EVERY: usize = 200;

/// Looks through `root` for folders holding a marker, depth first in name order. Never inside a folder holding one,
/// past `look.depth`, into a folder `look` passes over or one it can't open, or through a link. `heard` hears
/// how far it has got every `HEARD_EVERY` folders and at each marker; `stopped` ends it early.
pub fn find_in(root: &Path, look: &Look, heard: &mut dyn FnMut(Heard), stopped: &dyn Fn() -> bool) -> Looked {
    let mut found = Vec::new();
    let mut looked = 0;
    let mut stack: Vec<(String, usize)> = vec![(String::new(), 0)];
    while let Some((dir, depth)) = stack.pop() {
        if stopped() {
            break;
        }
        let Ok(read) = fs::read_dir(if dir.is_empty() { root.to_path_buf() } else { root.join(&dir) }) else { continue };
        looked += 1;
        let mut files = Vec::new();
        let mut dirs = Vec::new();
        for entry in read.flatten() {
            let Ok(kind) = entry.file_type() else { continue };
            let name = entry.file_name().to_string_lossy().into_owned();
            // A link, or a Windows junction, is neither: Studio never follows one.
            if kind.is_file() {
                files.push(name);
            } else if kind.is_dir() {
                dirs.push(name);
            }
        }
        if let Some(marker) = look.markers.iter().find(|marker| files.contains(marker)) {
            found.push(Found { dir, marker: marker.clone() });
            heard(Heard { looked, found: found.len() });
            continue;
        }
        if looked % HEARD_EVERY == 0 {
            heard(Heard { looked, found: found.len() });
        }
        if depth >= look.depth {
            continue;
        }
        dirs.retain(|name| !look.skip.contains(name) && !look.skip_starts.iter().any(|start| name.starts_with(start.as_str())));
        dirs.sort();
        // Pushed last to first, so the first by name is looked in first.
        for name in dirs.into_iter().rev() {
            stack.push((if dir.is_empty() { name } else { format!("{dir}/{name}") }, depth + 1));
        }
    }
    heard(Heard { looked, found: found.len() });
    Looked { found, looked }
}

/// The search a Library screen is running, so Stop looking (or leaving the screen) can end it.
#[derive(Default)]
pub struct LibrarySearch(pub std::sync::Mutex<Option<Arc<AtomicBool>>>);

#[tauri::command]
pub async fn library_find(search: tauri::State<'_, LibrarySearch>, root: String, look: Look, heard: Channel<Heard>) -> Result<Looked, String> {
    let root = library_root(&root)?;
    let stop = Arc::new(AtomicBool::new(false));
    if let Ok(mut current) = search.0.lock() {
        *current = Some(stop.clone());
    }
    tauri::async_runtime::spawn_blocking(move || {
        find_in(&root, &look, &mut |progress| {
            let _ = heard.send(progress);
        }, &|| stop.load(Ordering::Relaxed))
    })
    .await
    .map_err(|e| e.to_string())
}

/// Ends the search running now, if there is one; it answers with what it found.
#[tauri::command]
pub fn library_stop(search: tauri::State<'_, LibrarySearch>) {
    if let Ok(current) = search.0.lock() {
        if let Some(stop) = current.as_ref() {
            stop.store(true, Ordering::Relaxed);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_inside_a_library_folder_and_never_outside_it() {
        let dir = std::env::temp_dir().join(format!("studio-library-{}", std::process::id()));
        fs::create_dir_all(dir.join("web-dev")).unwrap();
        fs::write(dir.join("web-dev/course.md"), "# Web Development").unwrap();
        let root = dir.to_string_lossy().to_string();
        assert_eq!(read_in(&root, "web-dev/course.md").unwrap(), b"# Web Development");
        assert_eq!(tauri::async_runtime::block_on(library_list(root.clone(), "".into())).unwrap().len(), 1);
        assert!(read_in(&root, "../outside.md").is_err());
        assert!(tauri::async_runtime::block_on(library_list(dir.join("missing").to_string_lossy().to_string(), "".into())).is_err());
        fs::remove_dir_all(dir).unwrap();
    }

    fn look() -> Look {
        Look {
            depth: 3,
            skip: vec!["node_modules".into()],
            skip_starts: vec![".".into(), "$".into()],
            markers: vec!["registry.json".into(), "course.md".into()],
        }
    }

    #[test]
    fn finds_courses_and_registries_and_passes_over_what_it_should() {
        let dir = std::env::temp_dir().join(format!("studio-library-find-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        for (path, text) in [
            ("b/web/course.md", "# Web"),
            ("b/web/old/course.md", "# Inside a course"),
            ("a/shared/registry.json", "{}"),
            ("a/shared/x/course.md", "# Inside a registry"),
            ("node_modules/x/course.md", "# Skipped"),
            (".git/course.md", "# Hidden"),
            ("$RECYCLE.BIN/course.md", "# Windows' own"),
            ("1/2/3/course.md", "# Three deep"),
            ("x/y/z/w/course.md", "# Too deep"),
        ] {
            fs::create_dir_all(dir.join(path).parent().unwrap()).unwrap();
            fs::write(dir.join(path), text).unwrap();
        }
        let mut heard = 0;
        let looked = find_in(&dir, &look(), &mut |_| heard += 1, &|| false);
        let found: Vec<(&str, &str)> = looked.found.iter().map(|f| (f.dir.as_str(), f.marker.as_str())).collect();
        assert_eq!(found, vec![("1/2/3", "course.md"), ("a/shared", "registry.json"), ("b/web", "course.md")]);
        assert!(heard >= 4);
        let stopped = find_in(&dir, &look(), &mut |_| {}, &|| true);
        assert_eq!(stopped, Looked { found: vec![], looked: 0 });
        fs::remove_dir_all(dir).unwrap();
    }
}
