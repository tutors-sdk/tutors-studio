//! RegistryPort's Tauri side (src/adapters/registry/tauri/tauri-registry.ts, ADR 0063): writing into a folder
//! registry, the one kind of library folder Studio writes to. A write lands only in a folder that already holds
//! a registry.json, or is the registry.json that starts one; `fs::resolve` keeps every path inside the folder.

use crate::fs::resolve;
use std::fs;
use std::path::PathBuf;

/// The registry folder a call names, and the file it writes, refused unless the folder is a registry.
fn registry_file(root: &str, path: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(root).canonicalize().map_err(|e| format!("{root}: {e}"))?;
    if !root.is_dir() {
        return Err(format!("{}: not a folder", root.display()));
    }
    if path != "registry.json" && !root.join("registry.json").is_file() {
        return Err(format!("{}: not a registry", root.display()));
    }
    let full = resolve(&root, path)?;
    if full == root {
        return Err(format!("{path}: not a file"));
    }
    Ok(full)
}

#[tauri::command]
pub fn registry_write(root: String, path: String, bytes: Vec<u8>) -> Result<(), String> {
    let full = registry_file(&root, &path)?;
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("{path}: {e}"))?;
    }
    fs::write(full, bytes).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command]
pub fn registry_remove(root: String, path: String) -> Result<(), String> {
    fs::remove_file(registry_file(&root, &path)?).map_err(|e| format!("{path}: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_only_inside_a_registry() {
        let dir = std::env::temp_dir().join(format!("studio-registry-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let root = dir.to_string_lossy().to_string();
        assert!(registry_write(root.clone(), "items/x/lab.md".into(), b"# Lab".to_vec()).is_err());
        registry_write(root.clone(), "registry.json".into(), b"{}".to_vec()).unwrap();
        registry_write(root.clone(), "items/x/lab.md".into(), b"# Lab".to_vec()).unwrap();
        assert_eq!(fs::read(dir.join("items/x/lab.md")).unwrap(), b"# Lab");
        assert!(registry_write(root.clone(), "../outside.md".into(), b"x".to_vec()).is_err());
        registry_remove(root.clone(), "items/x/lab.md".into()).unwrap();
        assert!(!dir.join("items/x/lab.md").exists());
        fs::remove_dir_all(dir).unwrap();
    }
}
