//! LibraryPort's Tauri side (src/adapters/library/tauri/tauri-library.ts, ADR 0061): the lecturer's library
//! folders, which Studio searches for Tutors courses. Each call names the folder it reads in, and
//! `fs::resolve` keeps every path inside it. Nothing here writes, moves or deletes.

use crate::fs::{list_dir, resolve, DirEntry};
use std::fs;
use std::path::PathBuf;

/// The library folder a call names, refused unless it is a folder that exists.
fn library_root(root: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(root).canonicalize().map_err(|e| format!("{root}: {e}"))?;
    if !root.is_dir() {
        return Err(format!("{}: not a folder", root.display()));
    }
    Ok(root)
}

#[tauri::command]
pub fn library_list(root: String, dir: String) -> Result<Vec<DirEntry>, String> {
    list_dir(&resolve(&library_root(&root)?, &dir)?).map_err(|e| format!("{dir}: {e}"))
}

#[tauri::command]
pub fn library_read(root: String, path: String) -> Result<Vec<u8>, String> {
    fs::read(resolve(&library_root(&root)?, &path)?).map_err(|e| format!("{path}: {e}"))
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
        assert_eq!(library_read(root.clone(), "web-dev/course.md".into()).unwrap(), b"# Web Development");
        assert_eq!(library_list(root.clone(), "".into()).unwrap().len(), 1);
        assert!(library_read(root.clone(), "../outside.md".into()).is_err());
        assert!(library_list(dir.join("missing").to_string_lossy().to_string(), "".into()).is_err());
        fs::remove_dir_all(dir).unwrap();
    }
}
