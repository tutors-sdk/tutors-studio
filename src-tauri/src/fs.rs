//! FileSystemPort's Tauri side (src/adapters/fs/tauri/tauri-fs.ts). The WebView never gets general file
//! access: it opens one course folder, and every later call is a path relative to it that `resolve`
//! refuses to let escape (STU-0006).

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

pub struct OpenCourse {
    root: PathBuf,
    _watcher: Option<RecommendedWatcher>,
}

pub struct CourseState(pub Mutex<Option<OpenCourse>>);

#[derive(Serialize, Debug, PartialEq)]
pub struct DirEntry {
    name: String,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
}

/// Joins a course-relative, "/"-separated path onto the root. Refuses absolute paths, drive prefixes,
/// "..", and backslashes, so nothing the WebView sends can reach outside the course folder.
pub fn resolve(root: &Path, relative: &str) -> Result<PathBuf, String> {
    if relative.contains('\\') {
        return Err(format!("{relative}: use / between folders"));
    }
    let mut out = root.to_path_buf();
    for component in Path::new(relative).components() {
        match component {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            _ => return Err(format!("{relative}: outside the course folder")),
        }
    }
    Ok(out)
}

/// The open course's root, for the publishing tools (tool.rs), which always run there.
pub fn open_root(state: &State<CourseState>) -> Result<PathBuf, String> {
    root_of(state)
}

fn root_of(state: &State<CourseState>) -> Result<PathBuf, String> {
    state.0.lock().map_err(|e| e.to_string())?.as_ref().map(|c| c.root.clone()).ok_or_else(|| "no course is open".to_string())
}

fn at(state: &State<CourseState>, relative: &str) -> Result<PathBuf, String> {
    resolve(&root_of(state)?, relative)
}

fn err<E: std::fmt::Display>(path: &str) -> impl Fn(E) -> String + '_ {
    move |e| format!("{path}: {e}")
}

pub fn list_dir(dir: &Path) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if meta.is_dir() {
            entries.push(DirEntry { name, kind: "dir", size: None });
        } else {
            entries.push(DirEntry { name, kind: "file", size: Some(meta.len()) });
        }
    }
    Ok(entries)
}

pub fn move_path(from: &Path, to: &Path) -> Result<(), String> {
    if to.exists() {
        return Err("already exists".to_string());
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(from, to).map_err(|e| e.to_string())
}

/// A new course's folder name: lower-case letters and digits in hyphen-separated runs, as Tutors
/// names folders. Anything else (a separator, "..", a dot) is refused, so the folder lands in `parent`.
pub fn is_course_folder_name(name: &str) -> bool {
    !name.is_empty() && name.split('-').all(|run| !run.is_empty() && run.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit()))
}

/// Makes `parent/name` as a new, empty folder, failing when anything already has that name.
pub fn make_course_folder(parent: &Path, name: &str) -> Result<PathBuf, String> {
    if !is_course_folder_name(name) {
        return Err(format!("{name}: not a course folder name"));
    }
    let folder = parent.join(name);
    fs::create_dir(&folder).map_err(|e| match e.kind() {
        std::io::ErrorKind::AlreadyExists => format!("{} already exists", folder.display()),
        _ => format!("{}: {e}", folder.display()),
    })?;
    Ok(folder)
}

#[tauri::command]
pub fn create_course(app: AppHandle, state: State<CourseState>, parent: String, name: String) -> Result<(), String> {
    let folder = make_course_folder(Path::new(&parent), &name)?;
    open_course(app, state, folder.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn open_course(app: AppHandle, state: State<CourseState>, root: String) -> Result<(), String> {
    let root = PathBuf::from(root).canonicalize().map_err(|e| e.to_string())?;
    if !root.is_dir() {
        return Err(format!("{}: not a folder", root.display()));
    }
    let emitter = app.clone();
    let watcher = notify::recommended_watcher(move |_event| {
        let _ = emitter.emit("course-changed", ());
    })
    .ok()
    .and_then(|mut w| w.watch(&root, RecursiveMode::Recursive).ok().map(|_| w));
    *state.0.lock().map_err(|e| e.to_string())? = Some(OpenCourse { root, _watcher: watcher });
    Ok(())
}

#[tauri::command]
pub fn fs_list(state: State<CourseState>, dir: String) -> Result<Vec<DirEntry>, String> {
    list_dir(&at(&state, &dir)?).map_err(err(&dir))
}

#[tauri::command]
pub fn fs_read(state: State<CourseState>, path: String) -> Result<Vec<u8>, String> {
    fs::read(at(&state, &path)?).map_err(err(&path))
}

#[tauri::command]
pub fn fs_write(state: State<CourseState>, path: String, bytes: Vec<u8>) -> Result<(), String> {
    let full = at(&state, &path)?;
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(err(&path))?;
    }
    fs::write(full, bytes).map_err(err(&path))
}

#[tauri::command]
pub fn fs_move(state: State<CourseState>, from: String, to: String) -> Result<(), String> {
    move_path(&at(&state, &from)?, &at(&state, &to)?).map_err(err(&to))
}

#[tauri::command]
pub fn fs_exists(state: State<CourseState>, path: String) -> Result<bool, String> {
    Ok(at(&state, &path)?.exists())
}

#[tauri::command]
pub fn fs_remove(state: State<CourseState>, path: String) -> Result<(), String> {
    fs::remove_file(at(&state, &path)?).map_err(err(&path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_keeps_paths_inside_the_course() {
        let root = Path::new("/courses/web");
        assert_eq!(resolve(root, "topic-01/talk-01/slides.pdf").unwrap(), root.join("topic-01").join("talk-01").join("slides.pdf"));
        assert_eq!(resolve(root, "").unwrap(), root.to_path_buf());
        assert_eq!(resolve(root, "./course.md").unwrap(), root.join("course.md"));
    }

    #[test]
    fn resolve_refuses_anything_that_escapes() {
        let root = Path::new("/courses/web");
        for bad in ["../other/course.md", "topic-01/../../x", "/etc/passwd", "topic-01\\..\\..\\x"] {
            assert!(resolve(root, bad).is_err(), "{bad} should be refused");
        }
    }

    #[test]
    fn list_and_move_work_on_disk_and_move_never_overwrites() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir_all(dir.path().join("Week 3")).unwrap();
        fs::write(dir.path().join("Week 3/topic.md"), "# Week 3").unwrap();
        fs::write(dir.path().join("course.md"), "# C").unwrap();
        let mut names: Vec<_> = list_dir(dir.path()).unwrap().into_iter().map(|e| format!("{}:{}", e.name, e.kind)).collect();
        names.sort();
        assert_eq!(names, vec!["Week 3:dir", "course.md:file"]);
        move_path(&dir.path().join("Week 3"), &dir.path().join("topic-week-3")).unwrap();
        assert!(dir.path().join("topic-week-3/topic.md").exists());
        assert_eq!(move_path(&dir.path().join("topic-week-3"), &dir.path().join("course.md")), Err("already exists".to_string()));
    }

    #[test]
    fn course_folder_names_are_plain_slugs() {
        for ok in ["web-dev", "a", "cs101", "intro-to-2027"] {
            assert!(is_course_folder_name(ok), "{ok}");
        }
        for bad in ["", "-a", "a-", "a--b", "Web", "a/b", "..", "a.b", "a b", "a\\b", "café"] {
            assert!(!is_course_folder_name(bad), "{bad}");
        }
    }

    #[test]
    fn make_course_folder_creates_once_and_never_reuses_a_folder() {
        let dir = tempfile::tempdir().unwrap();
        let parent = dir.path().to_path_buf();
        let made = make_course_folder(&parent, "web-dev").unwrap();
        assert!(made.is_dir());
        fs::write(made.join("course.md"), "# Mine").unwrap();
        let again = make_course_folder(&parent, "web-dev").unwrap_err();
        assert!(again.ends_with("already exists"), "{again}");
        assert_eq!(fs::read_to_string(made.join("course.md")).unwrap(), "# Mine");
        assert!(make_course_folder(&parent, "../escape").is_err());
        assert!(!parent.join("../escape").exists());
    }
}
