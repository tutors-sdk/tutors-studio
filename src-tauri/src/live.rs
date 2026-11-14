//! LocalTutorsPort's Tauri side (src/adapters/local-tutors/tauri, ADR 0042): the course live in Tutors on
//! this computer. Serves the open course's built folder (json/) on 127.0.0.1 only, starts the reader with
//! `pnpm dev` only in a folder that is a copy of the Tutors repository, and shows the course in a Tutors
//! window of its own, which has no access to Studio's commands (capabilities name only the main window).

use serde::Serialize;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::path::{Component, Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::fs::CourseState;

/// The first port the course is served on, as in src/domain/live-tutors.ts; the next free one up to 8199 after.
const COURSE_PORT: u16 = 8190;
/// The reader's usual port under `pnpm dev`, where Studio looks for a Tutors already running.
const READER_PORT: u16 = 5173;
/// The Tutors repository's package name, and what the reader's /healthz names itself.
const TUTORS_PACKAGE: &str = "tutors-mono-repo";
const READER_APP: &str = "tutors-reader";
/// How long the first `pnpm dev` may take: it builds Tutors' UI packages before the reader starts.
const READER_WAIT: Duration = Duration::from_secs(300);
/// The label of Studio's Tutors window.
const WINDOW: &str = "tutors";

struct Server {
    port: u16,
    root: PathBuf,
    stop: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct Live {
    server: Option<Server>,
    reader: Option<Child>,
}

pub struct LiveState(pub Mutex<Live>);

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Facts {
    package_name: Option<String>,
    reader: bool,
    installed: bool,
}

/// What Studio can see in a folder the lecturer chose as their copy of Tutors.
pub fn facts_of(folder: &Path) -> Facts {
    let package_name = std::fs::read_to_string(folder.join("package.json"))
        .ok()
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
        .and_then(|json| json.get("name").and_then(|name| name.as_str()).map(str::to_string));
    Facts { package_name, reader: folder.join("apps").join("reader").is_dir(), installed: folder.join("node_modules").is_dir() }
}

/// The file a request path names inside `root`, or None for anything outside it or not a file.
pub fn file_for(root: &Path, request_path: &str) -> Option<PathBuf> {
    let path = request_path.split(['?', '#']).next().unwrap_or("");
    let decoded = percent_decode(path)?;
    let mut file = root.to_path_buf();
    for component in Path::new(decoded.trim_start_matches('/')).components() {
        match component {
            Component::Normal(part) => file.push(part),
            Component::CurDir => {}
            _ => return None,
        }
    }
    let file = file.canonicalize().ok()?;
    (file.starts_with(root) && file.is_file()).then_some(file)
}

fn percent_decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = std::str::from_utf8(bytes.get(i + 1..i + 3)?).ok()?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

fn content_type(file: &Path) -> &'static str {
    match file.extension().and_then(|e| e.to_str()).map(str::to_ascii_lowercase).as_deref() {
        Some("json") => "application/json",
        Some("html") => "text/html",
        Some("md") => "text/markdown",
        Some("pdf") => "application/pdf",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("zip") => "application/zip",
        Some("js") => "text/javascript",
        Some("css") => "text/css",
        _ => "application/octet-stream",
    }
}

/// Answers one request: GET or HEAD of a file inside `root`, with the CORS header Netlify sets and no caching.
fn answer(mut stream: TcpStream, root: &Path) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
    let mut head = Vec::new();
    let mut buffer = [0u8; 1024];
    while !head.windows(4).any(|w| w == b"\r\n\r\n") && head.len() < 16 * 1024 {
        match stream.read(&mut buffer) {
            Ok(0) | Err(_) => break,
            Ok(n) => head.extend_from_slice(&buffer[..n]),
        }
    }
    let head = String::from_utf8_lossy(&head);
    let mut parts = head.lines().next().unwrap_or("").split_whitespace();
    let (method, path) = (parts.next().unwrap_or(""), parts.next().unwrap_or("/"));
    let common = "Access-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nConnection: close\r\n";
    let reply = match (method, file_for(root, path)) {
        ("GET" | "HEAD", Some(file)) => match std::fs::read(&file) {
            Ok(body) => {
                let header = format!("HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\n{common}\r\n", content_type(&file), body.len());
                let mut reply = header.into_bytes();
                if method == "GET" {
                    reply.extend_from_slice(&body);
                }
                reply
            }
            Err(_) => format!("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n{common}\r\n").into_bytes(),
        },
        ("GET" | "HEAD", None) => format!("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n{common}\r\n").into_bytes(),
        _ => format!("HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n{common}\r\n").into_bytes(),
    };
    let _ = stream.write_all(&reply);
}

/// Serves `root` on the first free port from COURSE_PORT, on 127.0.0.1 only, until `stop` is set.
fn serve(root: PathBuf) -> Result<Server, String> {
    let listener = (COURSE_PORT..COURSE_PORT + 10)
        .find_map(|port| TcpListener::bind(("127.0.0.1", port)).ok())
        .ok_or_else(|| format!("Ports {COURSE_PORT} to {} are all in use on this computer.", COURSE_PORT + 9))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let stop = Arc::new(AtomicBool::new(false));
    let (flag, served) = (stop.clone(), root.clone());
    thread::spawn(move || {
        while !flag.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _)) => {
                    let _ = stream.set_nonblocking(false);
                    let root = served.clone();
                    thread::spawn(move || answer(stream, &root));
                }
                Err(_) => thread::sleep(Duration::from_millis(40)),
            }
        }
    });
    Ok(Server { port, root, stop })
}

/// Whether the Tutors reader answers on `port` of this computer (IPv4 or IPv6, as `localhost` resolves).
fn reader_answers(port: u16) -> bool {
    let Ok(addresses) = ("localhost", port).to_socket_addrs() else { return false };
    addresses.into_iter().any(|address| {
        let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(800)) else { return false };
        let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
        if stream.write_all(format!("GET /healthz HTTP/1.0\r\nHost: localhost:{port}\r\n\r\n").as_bytes()).is_err() {
            return false;
        }
        let mut body = String::new();
        let _ = stream.take(256 * 1024).read_to_string(&mut body);
        body.contains(READER_APP)
    })
}

/// The address a line of `pnpm dev`'s output says the reader answers on ("Local:   http://localhost:5174/").
pub fn origin_in(line: &str) -> Option<String> {
    let mut plain = String::new();
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' {
            for next in chars.by_ref() {
                if next.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            plain.push(c);
        }
    }
    let after = plain.split("Local:").nth(1)?.trim_start();
    let rest = after.strip_prefix("http://localhost:").or_else(|| after.strip_prefix("http://127.0.0.1:"))?;
    let digits: String = rest.chars().take_while(char::is_ascii_digit).collect();
    let host = if after.starts_with("http://localhost:") { "localhost" } else { "127.0.0.1" };
    (!digits.is_empty()).then(|| format!("http://{host}:{digits}"))
}

/// True for a link Studio shows in its Tutors window: a reader on this computer reading a course on this computer.
pub fn is_live_link(link: &str) -> bool {
    let Some(rest) = link.strip_prefix("http://localhost:").or_else(|| link.strip_prefix("http://127.0.0.1:")) else { return false };
    let Some((port, course)) = rest.split_once("/course/127.0.0.1:") else { return false };
    let numeric = |s: &str| !s.is_empty() && s.len() <= 5 && s.chars().all(|c| c.is_ascii_digit());
    numeric(port) && numeric(course)
}

fn stop_child(child: &mut Child) {
    #[cfg(unix)]
    {
        // `pnpm dev` runs Vite as a child of its own: stop the whole group Studio started it in.
        let _ = Command::new("kill").args(["-TERM", &format!("-{}", child.id())]).status();
    }
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill").args(["/PID", &child.id().to_string(), "/T", "/F"]).status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

/// Stops serving the course and the reader Studio started; heard when Studio quits, too.
pub fn stop_all(live: &mut Live) {
    if let Some(server) = live.server.take() {
        server.stop.store(true, Ordering::Relaxed);
    }
    if let Some(mut child) = live.reader.take() {
        stop_child(&mut child);
    }
}

#[tauri::command]
pub fn tutors_facts(folder: String) -> Facts {
    facts_of(Path::new(&folder))
}

/// Serves the open course's json/ folder, starting again if a different course was served before; the port.
#[tauri::command]
pub fn tutors_serve(course: State<CourseState>, live: State<LiveState>) -> Result<u16, String> {
    let root = crate::fs::open_root(&course)?.join("json").canonicalize().map_err(|_| "The course hasn't been built yet.".to_string())?;
    let mut live = live.0.lock().map_err(|e| e.to_string())?;
    if let Some(server) = &live.server {
        if server.root == root {
            return Ok(server.port);
        }
        server.stop.store(true, Ordering::Relaxed);
        thread::sleep(Duration::from_millis(100));
    }
    let server = serve(root)?;
    let port = server.port;
    live.server = Some(server);
    Ok(port)
}

#[tauri::command]
pub async fn tutors_reader_answers() -> bool {
    tauri::async_runtime::spawn_blocking(|| reader_answers(READER_PORT)).await.unwrap_or(false)
}

/// Starts `pnpm dev` in the lecturer's copy of Tutors, in anonymous mode, and waits for the address it answers on.
#[tauri::command]
pub async fn tutors_reader_start(live: State<'_, LiveState>, folder: String) -> Result<String, String> {
    let folder = PathBuf::from(folder);
    let facts = facts_of(&folder);
    if facts.package_name.as_deref() != Some(TUTORS_PACKAGE) || !facts.reader {
        return Err("This folder isn't a copy of Tutors.".into());
    }
    let mut command = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.args(["/C", "pnpm", "dev"]);
        c
    } else {
        let mut c = Command::new("pnpm");
        c.arg("dev");
        c
    };
    command.current_dir(&folder).env("PUBLIC_ANON_MODE", "TRUE").stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let mut child = command.spawn().map_err(|e| format!("Studio couldn't run pnpm: {e}"))?;
    let heard = Arc::new(Mutex::new((None::<String>, Vec::<String>::new())));
    for pipe in [child.stdout.take().map(|p| Box::new(p) as Box<dyn Read + Send>), child.stderr.take().map(|p| Box::new(p) as Box<dyn Read + Send>)].into_iter().flatten() {
        let heard = heard.clone();
        thread::spawn(move || {
            for line in BufReader::new(pipe).lines().map_while(Result::ok) {
                let mut heard = heard.lock().unwrap();
                if heard.0.is_none() {
                    heard.0 = origin_in(&line);
                }
                heard.1.push(line);
                if heard.1.len() > 40 {
                    heard.1.remove(0);
                }
            }
        });
    }
    let started = Instant::now();
    let outcome = tauri::async_runtime::spawn_blocking(move || loop {
        let (origin, lines) = {
            let heard = heard.lock().unwrap();
            (heard.0.clone(), heard.1.iter().rev().take(12).rev().cloned().collect::<Vec<_>>().join("\n"))
        };
        if let Some(origin) = origin {
            return (child, Ok(origin));
        }
        if let Ok(Some(status)) = child.try_wait() {
            return (child, Err(format!("pnpm dev stopped ({status}).\n{lines}")));
        }
        if started.elapsed() > READER_WAIT {
            return (child, Err(format!("Tutors didn't answer within {} seconds.\n{lines}", READER_WAIT.as_secs())));
        }
        thread::sleep(Duration::from_millis(250));
    })
    .await
    .map_err(|e| e.to_string())?;
    let (mut child, result) = outcome;
    match result {
        Ok(origin) => {
            let mut live = live.0.lock().map_err(|e| e.to_string())?;
            if let Some(mut earlier) = live.reader.replace(child) {
                stop_child(&mut earlier);
            }
            Ok(origin)
        }
        Err(reason) => {
            stop_child(&mut child);
            Err(reason)
        }
    }
}

/// Shows the course in Studio's Tutors window, opening it the first time.
#[tauri::command]
pub async fn tutors_show(app: AppHandle, link: String) -> Result<(), String> {
    if !is_live_link(&link) {
        return Err("Studio shows only a Tutors reader on this computer.".into());
    }
    let url = tauri::Url::parse(&link).map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window(WINDOW) {
        window.navigate(url).map_err(|e| e.to_string())?;
        let _ = window.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, WINDOW, WebviewUrl::External(url))
        .title("Tutors on this computer")
        .inner_size(1200.0, 820.0)
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Reloads the Tutors window on the page it shows, so the reader reads the new build.
#[tauri::command]
pub fn tutors_refresh(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window(WINDOW) {
        Some(window) => window.eval("location.reload()").map_err(|e| e.to_string()),
        None => Ok(()),
    }
}

#[tauri::command]
pub fn tutors_stop(app: AppHandle, live: State<LiveState>) -> Result<(), String> {
    stop_all(&mut *live.0.lock().map_err(|e| e.to_string())?);
    if let Some(window) = app.get_webview_window(WINDOW) {
        let _ = window.close();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serves_only_files_inside_the_built_folder() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("json");
        std::fs::create_dir_all(root.join("topic-01")).unwrap();
        std::fs::write(root.join("tutors.json"), "{}").unwrap();
        std::fs::write(root.join("topic-01/a b.png"), "x").unwrap();
        std::fs::write(dir.path().join("secret.txt"), "no").unwrap();
        let root = root.canonicalize().unwrap();
        assert!(file_for(&root, "/tutors.json?v=2").is_some());
        assert!(file_for(&root, "/topic-01/a%20b.png").is_some());
        assert!(file_for(&root, "/../secret.txt").is_none());
        assert!(file_for(&root, "/%2e%2e/secret.txt").is_none());
        assert!(file_for(&root, "/topic-01").is_none());
        assert!(file_for(&root, "/missing.json").is_none());
    }

    #[test]
    fn answers_with_cors_and_no_caching() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("tutors.json"), "{\"title\":\"Web\"}").unwrap();
        let server = serve(dir.path().canonicalize().unwrap()).unwrap();
        let mut stream = TcpStream::connect(("127.0.0.1", server.port)).unwrap();
        stream.write_all(b"GET /tutors.json HTTP/1.1\r\nHost: x\r\n\r\n").unwrap();
        let mut reply = String::new();
        stream.read_to_string(&mut reply).unwrap();
        server.stop.store(true, Ordering::Relaxed);
        assert!(reply.starts_with("HTTP/1.1 200"));
        assert!(reply.contains("Access-Control-Allow-Origin: *"));
        assert!(reply.contains("Cache-Control: no-store"));
        assert!(reply.ends_with("{\"title\":\"Web\"}"));
    }

    #[test]
    fn reads_the_readers_address_from_pnpm_dev() {
        assert_eq!(origin_in("  \u{1b}[32m➜\u{1b}[39m  \u{1b}[1mLocal\u{1b}[22m:   \u{1b}[36mhttp://localhost:\u{1b}[1m5174\u{1b}[22m/\u{1b}[39m"), Some("http://localhost:5174".into()));
        assert_eq!(origin_in("  ➜  Network: use --host to expose"), None);
    }

    #[test]
    fn shows_only_a_reader_and_course_on_this_computer() {
        assert!(is_live_link("http://localhost:5173/course/127.0.0.1:8190"));
        assert!(!is_live_link("https://evil.example/course/127.0.0.1:8190"));
        assert!(!is_live_link("http://localhost:5173/course/evil.example"));
        assert!(!is_live_link("http://localhost:5173/course/127.0.0.1:8190/../x"));
    }

    #[test]
    fn knows_a_copy_of_tutors() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("package.json"), "{\"name\":\"tutors-mono-repo\"}").unwrap();
        std::fs::create_dir_all(dir.path().join("apps/reader")).unwrap();
        assert_eq!(facts_of(dir.path()), Facts { package_name: Some("tutors-mono-repo".into()), reader: true, installed: false });
    }
}
