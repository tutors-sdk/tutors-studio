//! ProcessPort's and SecretsPort's Tauri side (src/adapters/process/tauri, src/adapters/secrets/tauri).
//! The WebView may run only the publishing tools, only in the shapes Studio's adapters use, always in
//! the open course folder, and may mount nothing from outside it into a container (ADR 0019).

use serde::Serialize;
use std::path::Path;
use std::process::Command;
use tauri::State;

use crate::fs::CourseState;

#[derive(Serialize, Debug, PartialEq)]
pub struct ToolResult {
    code: Option<i32>,
    stdout: String,
    stderr: String,
}

/// The Tutors generator Studio may run, pinned like src/domain/publish.ts.
const GENERATOR: &str = "jsr:@tutors/tutors@5.3.0";
/// The generator that builds a course as a website of its own (tutors-lite), pinned the same way.
const WEBSITE_GENERATOR: &str = "jsr:@tutors/tutors-lite@5.3.0";

/// The only image Studio runs, pinned like the tutors-gen adapter: deno, when this computer has no deno of its own.
/// The local reader and its course server are retired (ADR 0031).
const IMAGE: &str = "docker.io/denoland/deno:2.9.6";

/// Flags that would widen what a container can reach; Studio never passes them.
const FORBIDDEN: [&str; 10] = ["--privileged", "--mount", "--volume", "--cap-add", "--device", "--pid", "--network", "--net", "--security-opt", "--env"];

/// Whether `args` are a call Studio's own adapters make. Containers may mount only paths inside `root`.
pub fn allowed(tool: &str, args: &[String], root: &Path) -> Result<(), String> {
    let first = args.first().map(String::as_str).unwrap_or("");
    let generate = |rest: &[String]| [GENERATOR, WEBSITE_GENERATOR].iter().any(|generator| rest == ["run", "-A", "--node-modules-dir=none", generator]);
    match tool {
        "deno" if args == ["--version"] || generate(args) => Ok(()),
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
        "docker" | "podman" => match first {
            "--version" if args.len() == 1 => Ok(()),
            "run" => {
                if args.iter().filter(|arg| arg.as_str() == IMAGE).count() != 1 {
                    return Err(format!("{tool}: Studio runs only its own pinned image"));
                }
                if args.iter().any(|arg| arg == "-e" || FORBIDDEN.iter().any(|flag| arg == flag || arg.starts_with(&format!("{flag}=")))) {
                    return Err(format!("{tool}: not a flag Studio passes"));
                }
                let root = root.to_string_lossy();
                for pair in args.windows(2) {
                    if pair[0] == "-v" {
                        // Studio mounts the course at /course for the generator.
                        let host = pair[1]
                            .strip_suffix(":/course")
                            .ok_or_else(|| format!("{tool}: Studio mounts only the open course folder"))?;
                        if !(host == root || host.starts_with(&format!("{root}/")) || host.starts_with(&format!("{root}\\"))) || host.contains("..") {
                            return Err(format!("{tool}: Studio mounts only the open course folder"));
                        }
                    }
                }
                Ok(())
            }
            _ => Err(format!("{tool} {first}: not a call Studio makes")),
        },
        _ => Err(format!("{tool}: not a tool Studio runs")),
    }
}

pub fn run(tool: &str, args: &[String], cwd: &Path) -> ToolResult {
    match Command::new(tool).args(args).current_dir(cwd).output() {
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
        assert!(allowed("docker", &args(&["--version"]), root).is_ok());
        assert!(allowed("docker", &args(&["rm", "-f", "tutors-studio-reader"]), root).is_err());
        assert!(allowed("docker", &args(&["exec", "x", "sh"]), root).is_err());
        assert!(allowed("docker", &args(&["run", "--rm", "-v", "/home/lecturer/web-dev:/course", "-w", "/course", IMAGE, "run", "-A"]), root).is_ok());
        assert!(allowed("podman", &args(&["run", "-d", "-v", "/home/lecturer/web-dev/json:/srv:ro", IMAGE]), root).is_err());
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
    fn runs_only_the_pinned_image_with_no_settings() {
        let root = Path::new("/home/lecturer/web-dev");
        assert!(allowed("docker", &args(&["run", "-d", "alpine"]), root).is_err());
        assert!(allowed("docker", &args(&["run", "--privileged", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "--mount=type=bind,src=/,dst=/h", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "--network", "host", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "-e", "LD_PRELOAD=/x.so", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "-e", "PUBLIC_ANON_MODE=TRUE", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "--env=LOG_LEVEL=debug", IMAGE]), root).is_err());
    }

    #[test]
    fn mounts_nothing_from_outside_the_course() {
        let root = Path::new("/home/lecturer/web-dev");
        assert!(allowed("docker", &args(&["run", "-v", "/:/host", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "-v", "/home/lecturer/web-dev-other:/course", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "-v", "/home/lecturer/web-dev/../.ssh:/course", IMAGE]), root).is_err());
        assert!(allowed("docker", &args(&["run", "-v", "/var/run/docker.sock:/var/run/docker.sock", IMAGE]), root).is_err());
    }

    #[test]
    fn a_missing_tool_gives_no_exit_code() {
        let result = run("tutors-studio-no-such-tool", &[], Path::new("."));
        assert_eq!(result.code, None);
    }
}
