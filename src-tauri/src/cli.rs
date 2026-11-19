//! CommandLinePort's Tauri side (src/adapters/command-line/tauri, ADR 0053): "Add the command line to this
//! computer" puts a small `tutors-studio` command on the lecturer's path that runs the bundled tools
//! program as `tutors-tools studio <course> <command>`, Studio's command line without a window. It writes
//! that one command file and, on Windows, adds its folder to the user's own PATH; nothing else.

use crate::tool::bundled_tools;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(tag = "kind")]
pub enum Added {
    #[serde(rename = "added")]
    Added { command: String, on_path: bool },
    #[serde(rename = "not-here")]
    NotHere { reason: String },
}

/// The command file's name and text, running `tools` as `tools studio <arguments>`.
pub fn shim(tools: &Path, windows: bool) -> (&'static str, String) {
    let tools = tools.display();
    if windows {
        ("tutors-studio.cmd", format!("@echo off\r\n\"{tools}\" studio %*\r\n"))
    } else {
        ("tutors-studio", format!("#!/bin/sh\nexec \"{tools}\" studio \"$@\"\n"))
    }
}

/// Whether `dir` is one of the folders in a PATH value.
pub fn on_path(path: &str, dir: &Path, windows: bool) -> bool {
    let same = |entry: &str| {
        let entry = entry.trim_end_matches(['/', '\\']);
        let dir = dir.to_string_lossy();
        let dir = dir.trim_end_matches(['/', '\\']);
        if windows {
            entry.eq_ignore_ascii_case(dir)
        } else {
            entry == dir
        }
    };
    path.split(if windows { ';' } else { ':' }).any(same)
}

/// Where the command goes: Studio's own folder of commands on Windows, ~/.local/bin elsewhere.
fn command_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if cfg!(windows) {
        Ok(app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("bin"))
    } else {
        Ok(app.path().home_dir().map_err(|e| e.to_string())?.join(".local").join("bin"))
    }
}

/// Adds `dir` to the user's own PATH (HKCU), read back so the answer says what is true.
#[cfg(windows)]
fn add_to_user_path(dir: &Path) -> Result<bool, String> {
    use std::process::Command;
    let script = "$d = $env:STUDIO_CLI_DIR; $p = [Environment]::GetEnvironmentVariable('Path', 'User'); \
        if (-not (($p -split ';') -contains $d)) { [Environment]::SetEnvironmentVariable('Path', ((@($p, $d) | Where-Object { $_ }) -join ';'), 'User') }; \
        [Environment]::GetEnvironmentVariable('Path', 'User')";
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .env("STUDIO_CLI_DIR", dir)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(on_path(String::from_utf8_lossy(&output.stdout).trim(), dir, true))
}

#[tauri::command]
pub fn cli_add(app: AppHandle) -> Result<Added, String> {
    let Some(tools) = bundled_tools() else {
        return Ok(Added::NotHere { reason: "This copy of Studio doesn't carry its command line. Install Studio from its installer to add it.".into() });
    };
    let dir = command_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let (name, text) = shim(&tools, cfg!(windows));
    let file = dir.join(name);
    fs::write(&file, text).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&file, fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    #[cfg(windows)]
    let found = add_to_user_path(&dir)?;
    #[cfg(not(windows))]
    let found = on_path(&std::env::var("PATH").unwrap_or_default(), &dir, false);
    Ok(Added::Added { command: file.display().to_string(), on_path: found })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_command_runs_the_tools_program_as_studio() {
        let (name, text) = shim(Path::new("/Applications/Tutors Studio.app/Contents/MacOS/tutors-tools"), false);
        assert_eq!(name, "tutors-studio");
        assert_eq!(text, "#!/bin/sh\nexec \"/Applications/Tutors Studio.app/Contents/MacOS/tutors-tools\" studio \"$@\"\n");
        let (name, text) = shim(Path::new("C:\\Program Files\\Tutors Studio\\tutors-tools.exe"), true);
        assert_eq!(name, "tutors-studio.cmd");
        assert_eq!(text, "@echo off\r\n\"C:\\Program Files\\Tutors Studio\\tutors-tools.exe\" studio %*\r\n");
    }

    #[test]
    fn finds_a_folder_on_the_path() {
        assert!(on_path("/usr/bin:/home/l/.local/bin/", Path::new("/home/l/.local/bin"), false));
        assert!(!on_path("/usr/bin", Path::new("/home/l/.local/bin"), false));
        assert!(on_path("C:\\Windows;c:\\users\\l\\appdata\\local\\dev.tutors.studio\\bin", Path::new("C:\\Users\\L\\AppData\\Local\\dev.tutors.studio\\bin"), true));
    }
}
