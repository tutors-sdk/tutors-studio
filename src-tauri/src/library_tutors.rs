//! LibraryTutorsPort's Tauri side (src/adapters/library-tutors/tauri, ADR 0068): the lecturer's library in
//! Tutors on this computer. A library folder is only ever read (STU-0264): each course is copied into
//! Studio's own folder (its app cache, `library-builds/`), built there with the Tutors generator, and the
//! build served on 127.0.0.1 only, one port each from 8300. The courses are then listed on the reader's
//! home page in Studio's Tutors window, by a fixed script whose only input goes in as JSON.

use serde::Deserialize;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, State};

use crate::bundle::GENERATOR;
use crate::live::{is_reader_home, serve_on, Server, COURSE_SITE, WINDOW};
use crate::tool::{bundled_tools, run, TOOLS};

/// The first port a library course is served on, as LIBRARY_PORT in src/domain/library-tutors.ts.
const LIBRARY_PORT: u16 = 8300;
/// How many ports library courses may take, as LIBRARY_PORTS there.
const LIBRARY_PORTS: u16 = 100;
/// Folders never copied: Tutors' own build output, dependencies, and anything hidden (.git).
const NOT_COPIED: [&str; 4] = ["json", "html", "node_modules", "_site"];
/// How long Studio waits for the Tutors window to show the reader's home page before listing the library.
const WINDOW_WAIT: Duration = Duration::from_secs(20);

/// The library courses served now, by the folder each was copied from.
#[derive(Default)]
pub struct LibraryServed(pub Mutex<HashMap<PathBuf, Server>>);

/// A course's entry on the reader's home page, as LibraryVisit in src/domain/library-tutors.ts.
#[derive(Deserialize, serde::Serialize, Debug, Clone, PartialEq)]
pub struct Visit {
    id: String,
    title: String,
    credits: String,
}

/// Whether a visit's id is a course Studio serves on this computer: "127.0.0.1:<port>".
fn served_here(id: &str) -> bool {
    id.strip_prefix("127.0.0.1:").is_some_and(|port| !port.is_empty() && port.len() <= 5 && port.chars().all(|c| c.is_ascii_digit()))
}

/// Copies the course in `from` into `to`, leaving out build output, dependencies and hidden folders, and
/// never through a link. `to` is emptied first. Nothing in `from` is written.
pub fn copy_course(from: &Path, to: &Path) -> std::io::Result<()> {
    if to.exists() {
        std::fs::remove_dir_all(to)?;
    }
    std::fs::create_dir_all(to)?;
    for entry in std::fs::read_dir(from)? {
        let entry = entry?;
        let name = entry.file_name();
        let text = name.to_string_lossy();
        let kind = entry.file_type()?;
        if kind.is_symlink() || text.starts_with('.') {
            continue;
        }
        if kind.is_dir() {
            if !NOT_COPIED.contains(&text.as_ref()) {
                copy_course(&entry.path(), &to.join(&name))?;
            }
        } else if kind.is_file() {
            std::fs::copy(entry.path(), to.join(&name))?;
        }
    }
    Ok(())
}

/// Where a library course's copy is built, inside Studio's own folder: one folder per course folder.
pub fn copy_folder(cache: &Path, course: &Path) -> PathBuf {
    let mut hasher = DefaultHasher::new();
    course.hash(&mut hasher);
    cache.join("library-builds").join(format!("{:016x}", hasher.finish()))
}

/// Builds the copy with the Tutors tools bundled beside Studio, else the pinned generator with Deno.
fn build(copy: &Path) -> Result<(), String> {
    let result = if bundled_tools().is_some() {
        run(TOOLS, &["build".to_string()], copy)
    } else {
        run("deno", &["run", "-A", "--node-modules-dir=none", GENERATOR].map(String::from), copy)
    };
    match result.code {
        None => Err(format!("Studio couldn't run the Tutors generator: {}", result.stderr.trim())),
        Some(0) if copy.join("json").join("tutors.json").is_file() => Ok(()),
        Some(_) => {
            let text = format!("{}\n{}", result.stdout, result.stderr);
            let lines: Vec<&str> = text.trim().lines().collect();
            Err(format!("The Tutors generator stopped before it finished building the course.\n{}", lines[lines.len().saturating_sub(12)..].join("\n")))
        }
    }
}

/// Copies the course in `folder` into Studio's own folder, builds it and serves the build; the port.
#[tauri::command]
pub async fn library_tutors_serve(app: AppHandle, served: State<'_, LibraryServed>, folder: String) -> Result<u16, String> {
    let course = PathBuf::from(&folder).canonicalize().map_err(|_| format!("Studio can't find {folder}."))?;
    if !course.join("course.md").is_file() {
        return Err(format!("{folder} isn't a Tutors course: it has no course.md."));
    }
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let copy = copy_folder(&cache, &course);
    let built = copy.clone();
    tauri::async_runtime::spawn_blocking(move || {
        copy_course(&course, &built).map_err(|e| format!("Studio couldn't copy the course: {e}"))?;
        build(&built)
    })
    .await
    .map_err(|e| e.to_string())??;
    let root = copy.join("json").canonicalize().map_err(|e| e.to_string())?;
    let mut served = served.0.lock().map_err(|e| e.to_string())?;
    if let Some(earlier) = served.remove(&PathBuf::from(&folder)) {
        earlier.stop.store(true, Ordering::Relaxed);
        thread::sleep(Duration::from_millis(100));
    }
    let server = serve_on(root, LIBRARY_PORT, LIBRARY_PORTS, COURSE_SITE)?;
    let port = server.port;
    served.insert(PathBuf::from(folder), server);
    Ok(port)
}

/// The script that lists the library on the reader's home page, as mergeLibraryVisits in
/// src/domain/library-tutors.ts does: courses Studio listed before and serves no longer come off, each
/// library course is added or retitled, every other course stays. It reloads the page only when the list
/// changed, so the reader shows it. The courses go in as JSON, so nothing in a title runs.
pub fn list_script(visits: &[Visit]) -> String {
    let library = serde_json::to_string(visits).unwrap_or_else(|_| "[]".into());
    format!(
        "(()=>{{const lib={library},now=new Date().toISOString();let v=[],b=[];\
try{{v=JSON.parse(localStorage.courseVisits||'[]')}}catch(e){{}}try{{b=JSON.parse(localStorage.studioLibrary||'[]')}}catch(e){{}}\
if(!Array.isArray(v))v=[];if(!Array.isArray(b))b=[];const ids=lib.map(c=>c.id);\
v=v.filter(x=>!(b.includes(x.id)&&!ids.includes(x.id)));\
for(const c of lib){{const x=v.find(y=>y.id===c.id);if(x){{x.title=c.title;x.credits=c.credits}}\
else v.push({{id:c.id,title:c.title,credits:c.credits,lastVisit:now,visits:0}})}}\
const was=localStorage.courseVisits||'',next=JSON.stringify(v);localStorage.courseVisits=next;\
localStorage.studioLibrary=JSON.stringify(ids);if(next!==was)location.reload();}})()"
    )
}

/// Lists the library on the reader's home page at `link`, once the Tutors window shows it.
#[tauri::command]
pub async fn library_tutors_list(app: AppHandle, link: String, visits: Vec<Visit>) -> Result<(), String> {
    if !is_reader_home(&link) {
        return Err("Studio lists the library only on a Tutors reader on this computer.".into());
    }
    if let Some(visit) = visits.iter().find(|visit| !served_here(&visit.id)) {
        return Err(format!("{}: not a course Studio serves on this computer.", visit.id));
    }
    let script = list_script(&visits);
    let home = link.trim_end_matches('/').to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let started = Instant::now();
        while started.elapsed() < WINDOW_WAIT {
            if let Some(window) = app.get_webview_window(WINDOW) {
                if window.url().is_ok_and(|url| url.as_str().trim_end_matches('/') == home) {
                    // Let the reader start before its list is changed under it.
                    thread::sleep(Duration::from_millis(400));
                    return window.eval(&script).map_err(|e| e.to_string());
                }
            }
            thread::sleep(Duration::from_millis(200));
        }
        Err("The Tutors window didn't show Tutors' home page in time, so Studio couldn't list your library there.".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Stops serving every library course; heard when Studio quits, too.
pub fn stop_all(served: &LibraryServed) {
    if let Ok(mut served) = served.0.lock() {
        for (_, server) in served.drain() {
            server.stop.store(true, Ordering::Relaxed);
        }
    }
}

#[tauri::command]
pub fn library_tutors_stop(served: State<LibraryServed>) {
    stop_all(&served);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_a_course_without_changing_it_or_taking_its_build() {
        let library = tempfile::tempdir().unwrap();
        let course = library.path().join("web-dev");
        std::fs::create_dir_all(course.join("topic-01/talk-1")).unwrap();
        std::fs::create_dir_all(course.join("json")).unwrap();
        std::fs::create_dir_all(course.join(".git")).unwrap();
        std::fs::write(course.join("course.md"), "Web Development").unwrap();
        std::fs::write(course.join("topic-01/talk-1/talk.md"), "Talk").unwrap();
        std::fs::write(course.join("json/tutors.json"), "{}").unwrap();
        std::fs::write(course.join(".git/HEAD"), "ref").unwrap();
        let cache = tempfile::tempdir().unwrap();
        let copy = copy_folder(cache.path(), &course);
        std::fs::create_dir_all(&copy).unwrap();
        std::fs::write(copy.join("stale.md"), "old").unwrap();
        copy_course(&course, &copy).unwrap();
        assert!(copy.starts_with(cache.path().join("library-builds")));
        assert_eq!(std::fs::read_to_string(copy.join("topic-01/talk-1/talk.md")).unwrap(), "Talk");
        assert!(!copy.join("json").exists() && !copy.join(".git").exists() && !copy.join("stale.md").exists());
        // The library folder is as it was.
        assert_eq!(std::fs::read_to_string(course.join("json/tutors.json")).unwrap(), "{}");
        assert_eq!(copy_folder(cache.path(), &course), copy);
        assert_ne!(copy_folder(cache.path(), &library.path().join("mobile")), copy);
    }

    #[test]
    fn a_title_cannot_run_in_the_tutors_window() {
        let script = list_script(&[Visit { id: "127.0.0.1:8300".into(), title: "x'});alert(1);({'".into(), credits: "</script>".into() }]);
        assert!(script.contains(r#""title":"x'});alert(1);({'""#));
        assert!(script.starts_with("(()=>{const lib=[{\"id\":\"127.0.0.1:8300\""));
    }

    #[test]
    fn lists_only_courses_served_on_this_computer() {
        assert!(served_here("127.0.0.1:8300"));
        assert!(!served_here("evil.example"));
        assert!(!served_here("127.0.0.1:8300/../x"));
        assert!(!served_here("127.0.0.1:"));
    }
}
