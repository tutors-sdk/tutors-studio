//! ProcessPort's and SecretsPort's Tauri side (src/adapters/process/tauri, src/adapters/secrets/tauri).
//! The WebView may run only the publishing tools, only in the shapes Studio's adapters use, always in
//! the open course folder (ADR 0019). The Tutors tools program bundled beside Studio comes first; Deno is
//! for a copy built without it, and containers are no longer run (ADR 0044).

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::State;

use crate::fs::CourseState;

#[derive(Serialize, Debug, PartialEq)]
pub struct ToolResult {
    code: Option<i32>,
    stdout: String,
    stderr: String,
}

// The generator and tutors-lite are pinned in tutors-bundle.json, like src/domain/publish.ts (ADR 0043).
use crate::bundle::{GENERATOR, WEBSITE_GENERATOR};

/// The Tutors tools program's name, as Tauri places a sidecar beside the app (ADR 0044).
pub const TOOLS: &str = "tutors-tools";

/// The bundled Tutors tools program, when this copy of Studio carries one: beside Studio's own program.
pub fn bundled_tools() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let path = exe.parent()?.join(format!("{TOOLS}{}", std::env::consts::EXE_SUFFIX));
    path.is_file().then_some(path)
}

/// Whether `args` are a call Studio's own adapters make.
pub fn allowed(tool: &str, args: &[String], _root: &Path) -> Result<(), String> {
    let first = args.first().map(String::as_str).unwrap_or("");
    let generate = |rest: &[String]| [GENERATOR, WEBSITE_GENERATOR].iter().any(|generator| rest == ["run", "-A", "--node-modules-dir=none", generator]);
    match tool {
        "deno" if args == ["--version"] || generate(args) => Ok(()),
        TOOLS if args.len() == 1 && ["--version", "build", "website"].contains(&first) => Ok(()),
        // Step 9's hand-off (src/adapters/publish/git): status, then add, commit and push, nothing else (ADR 0021).
        "git" => {
            let fixed: &[&[&str]] = &[
                &["--version"],
                &["rev-parse", "--is-inside-work-tree"],
                &["rev-parse", "--abbrev-ref", "HEAD"],
                &["status", "--porcelain"],
                &["remote"],
                &["add", "-A"],
            ];
            let remote_name = |name: &str| !name.is_empty() && !name.starts_with('-') && name.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c));
            if fixed.iter().any(|shape| args.iter().map(String::as_str).eq(shape.iter().copied()))
                || (args.len() == 3 && args[0] == "commit" && args[1] == "-m")
                || (args.len() == 4 && args[0] == "push" && args[1] == "-u" && remote_name(&args[2]) && args[3] == "HEAD")
            {
                Ok(())
            } else {
                Err(format!("git {first}: not a call Studio makes"))
            }
        }
        _ => Err(format!("{tool}: not a tool Studio runs")),
    }
}

pub fn run(tool: &str, args: &[String], cwd: &Path) -> ToolResult {
    let program = if tool == TOOLS {
        match bundled_tools() {
            Some(path) => path,
            None => return ToolResult { code: None, stdout: String::new(), stderr: "this copy of Studio carries no Tutors tools".into() },
        }
    } else {
        PathBuf::from(tool)
    };
    match Command::new(program).args(args).current_dir(cwd).output() {
        Ok(out) => ToolResult {
            code: Some(out.status.code().unwrap_or(1)),
            stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
        },
        Err(e) => ToolResult { code: None, stdout: String::new(), stderr: e.to_string() },
    }
}

#[tauri::command]
pub async fn run_tool(state: State<'_, CourseState>, tool: String, args: Vec<String>) -> Result<ToolResult, String> {
    let root = crate::fs::open_root(&state)?;
    allowed(&tool, &args, &root)?;
    tauri::async_runtime::spawn_blocking(move || run(&tool, &args, &root)).await.map_err(|e| e.to_string())
}

const SERVICE: &str = "dev.tutors.studio";

#[tauri::command]
pub fn secret_get(name: String) -> Result<Option<String>, String> {
    match keyring::Entry::new(SERVICE, &name).map_err(|e| e.to_string())?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn secret_set(name: String, value: String) -> Result<(), String> {
    keyring::Entry::new(SERVICE, &name).map_err(|e| e.to_string())?.set_password(&value).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn runs_only_the_calls_studio_makes() {
        let root = Path::new("/home/lecturer/web-dev");
        assert!(allowed("deno", &args(&["--version"]), root).is_ok());
        assert!(allowed("deno", &args(&["run", "-A", "--node-modules-dir=none", GENERATOR]), root).is_ok());
        assert!(allowed("deno", &args(&["run", "-A", "--node-modules-dir=none", WEBSITE_GENERATOR]), root).is_ok());
        assert!(allowed("deno", &args(&["run", "-A", "--node-modules-dir=none", "jsr:@tutors/tutors-lite"]), root).is_err());
        assert!(allowed("deno", &args(&["run", "-A", "evil.ts"]), root).is_err());
        assert!(allowed("bash", &args(&["-c", "rm -rf /"]), root).is_err());
        assert!(allowed("tutors-tools", &args(&["build"]), root).is_ok());
        assert!(allowed("tutors-tools", &args(&["website"]), root).is_ok());
        assert!(allowed("tutors-tools", &args(&["--version"]), root).is_ok());
        assert!(allowed("tutors-tools", &args(&["build", "--out", "/etc"]), root).is_err());
        assert!(allowed("tutors-tools", &args(&["validate"]), root).is_err());
        // Containers are no longer run (ADR 0044).
        assert!(allowed("docker", &args(&["--version"]), root).is_err());
        assert!(allowed("podman", &args(&["run", "--rm", "x"]), root).is_err());
    }

    #[test]
    fn runs_only_the_git_calls_of_the_hand_off() {
        let root = Path::new("/home/lecturer/web-dev");
        assert!(allowed("git", &args(&["status", "--porcelain"]), root).is_ok());
        assert!(allowed("git", &args(&["commit", "-m", "Week 3 slides"]), root).is_ok());
        assert!(allowed("git", &args(&["push", "-u", "origin", "HEAD"]), root).is_ok());
        assert!(allowed("git", &args(&["push", "-u", "--receive-pack=evil", "HEAD"]), root).is_err());
        assert!(allowed("git", &args(&["-c", "core.sshCommand=evil", "push"]), root).is_err());
        assert!(allowed("git", &args(&["clone", "https://x"]), root).is_err());
        assert!(allowed("git", &args(&["commit", "-m", "x", "--amend"]), root).is_err());
    }

    #[test]
    fn a_copy_without_the_tools_says_so() {
        // The test binary has no tutors-tools beside it, as a copy of Studio built without them.
        let result = run(TOOLS, &args(&["--version"]), Path::new("."));
        assert_eq!(result.code, None);
        assert!(result.stderr.contains("no Tutors tools"));
    }

    #[test]
    fn a_missing_tool_gives_no_exit_code() {
        let result = run("tutors-studio-no-such-tool", &[], Path::new("."));
        assert_eq!(result.code, None);
    }
}
