//! An assistant on this computer (ADRs 0051, 0052): the lecturer's switch for each course and the plans
//! that wait for them, as files in Studio's config folder that the command line's MCP server
//! (src/adapters/agent-access/node, src/adapters/agent-plans/node) reads and writes too:
//! `agent-courses.json` (`{ "courses": [...] }`), `studio-open.json` (`{ "course", "pid" }`) and
//! `agent-plans/<queue id>.json` (`{ "course", "plan" }`). Courses are spelled as `courseKey` spells them.
//! Nothing here touches a course: a waiting plan applies only through the window's applyPlan.

use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// STUDIO_CONFIG_DIR, as the command line honours it, else the app's config folder (named by its identifier).
fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    match std::env::var_os("STUDIO_CONFIG_DIR") {
        Some(dir) => Ok(PathBuf::from(dir)),
        None => app.path().app_config_dir().map_err(|e| e.to_string()),
    }
}

/// src/domain/agent.ts's courseKey: forward slashes, no slash at the end, lower case on Windows.
pub fn course_key(folder: &str) -> String {
    let slashed = folder.replace('\\', "/");
    let trimmed = if slashed.len() > 1 { slashed.trim_end_matches('/').to_string() } else { slashed };
    if cfg!(windows) {
        trimmed.to_lowercase()
    } else {
        trimmed
    }
}

fn read_json(path: &PathBuf) -> Option<Value> {
    serde_json::from_str(&fs::read_to_string(path).ok()?).ok()
}

fn write_json(path: &PathBuf, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, format!("{}\n", serde_json::to_string_pretty(value).map_err(|e| e.to_string())?)).map_err(|e| e.to_string())
}

fn allowed_courses(dir: &PathBuf) -> Vec<String> {
    read_json(&dir.join("agent-courses.json"))
        .and_then(|value| value.get("courses").and_then(Value::as_array).cloned())
        .map(|courses| courses.iter().filter_map(|course| course.as_str().map(String::from)).collect())
        .unwrap_or_default()
}

#[tauri::command]
pub fn agent_allowed(app: AppHandle, course: String) -> Result<bool, String> {
    Ok(allowed_courses(&config_dir(&app)?).contains(&course_key(&course)))
}

#[tauri::command]
pub fn agent_set(app: AppHandle, course: String, allowed: bool) -> Result<(), String> {
    let dir = config_dir(&app)?;
    let key = course_key(&course);
    let mut courses: Vec<String> = allowed_courses(&dir).into_iter().filter(|known| *known != key).collect();
    if allowed {
        courses.push(key);
    }
    write_json(&dir.join("agent-courses.json"), &json!({ "courses": courses }))
}

/// The window has this course open (or none): an assistant's plans for it wait instead of applying.
#[tauri::command]
pub fn agent_opened(app: AppHandle, course: Option<String>) -> Result<(), String> {
    let file = config_dir(&app)?.join("studio-open.json");
    match course {
        Some(course) => write_json(&file, &json!({ "course": course_key(&course), "pid": std::process::id() })),
        None => forget_open(&file),
    }
}

/// Takes studio-open.json away if this app wrote it (on closing a course, and when Studio quits).
fn forget_open(file: &PathBuf) -> Result<(), String> {
    let ours = read_json(file).and_then(|value| value.get("pid").and_then(Value::as_u64)) == Some(u64::from(std::process::id()));
    if ours {
        fs::remove_file(file).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn quit(app: &AppHandle) {
    if let Ok(dir) = config_dir(app) {
        let _ = forget_open(&dir.join("studio-open.json"));
    }
}

#[derive(Serialize)]
pub struct Waiting {
    id: String,
    plan: String,
}

#[tauri::command]
pub fn agent_waiting(app: AppHandle, course: String) -> Result<Vec<Waiting>, String> {
    let queue = config_dir(&app)?.join("agent-plans");
    let key = course_key(&course);
    let Ok(entries) = fs::read_dir(&queue) else { return Ok(vec![]) };
    let mut names: Vec<String> = entries.filter_map(|entry| entry.ok()?.file_name().into_string().ok()).filter(|name| name.ends_with(".json")).collect();
    names.sort();
    Ok(names
        .into_iter()
        .filter_map(|name| {
            let value = read_json(&queue.join(&name))?;
            (value.get("course")?.as_str()? == key).then(|| Waiting { id: name.trim_end_matches(".json").to_string(), plan: value["plan"].to_string() })
        })
        .collect())
}

fn queue_id(id: &str) -> bool {
    !id.is_empty() && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

#[tauri::command]
pub fn agent_settle(app: AppHandle, id: String) -> Result<(), String> {
    if !queue_id(&id) {
        return Err(format!("{id}: not a waiting plan"));
    }
    let file = config_dir(&app)?.join("agent-plans").join(format!("{id}.json"));
    match fs::remove_file(file) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn course_keys_match_the_command_lines() {
        assert_eq!(course_key("/courses/web-dev/"), "/courses/web-dev");
        assert_eq!(course_key("/"), "/");
        if cfg!(windows) {
            assert_eq!(course_key("C:\\Users\\L\\Web Dev\\"), "c:/users/l/web dev");
        } else {
            assert_eq!(course_key("/home/L/Web Dev"), "/home/L/Web Dev");
        }
    }

    #[test]
    fn only_queue_ids_settle() {
        assert!(queue_id("0abc123-1f2e3d4c"));
        assert!(!queue_id("../agent-courses"));
        assert!(!queue_id(""));
        assert!(!queue_id("x.json"));
    }
}
