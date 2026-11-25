//! The loopback redirect for signing in to Google in the browser (src/adapters/registry/tauri/tauri-loopback.ts,
//! ADR 0064): Studio listens on 127.0.0.1 on a port the system picks, Google sends the browser back to it with the
//! answer in the query string, and Studio shows a page saying the lecturer can return to Studio. One answer per
//! sign-in; nothing listens once it has arrived or after five minutes.

use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Mutex;
use std::time::{Duration, Instant};

static LISTENER: Mutex<Option<TcpListener>> = Mutex::new(None);
const WAIT: Duration = Duration::from_secs(300);
const PAGE: &str = "<!doctype html><meta charset=utf-8><title>Tutors Studio</title><body style=\"font-family:system-ui;margin:4rem\"><h1>You're signed in</h1><p>You can close this tab and go back to Tutors Studio.</p>";

/// Starts listening and returns the port, for the redirect address.
#[tauri::command]
pub fn oauth_loopback_start() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    *LISTENER.lock().map_err(|e| e.to_string())? = Some(listener);
    Ok(port)
}

/// The query string of the first request to the listener, in the five minutes after it started.
#[tauri::command]
pub async fn oauth_loopback_wait() -> Result<String, String> {
    let listener = LISTENER.lock().map_err(|e| e.to_string())?.take().ok_or("Studio isn't waiting for a sign-in.")?;
    tauri::async_runtime::spawn_blocking(move || answer(&listener, WAIT)).await.map_err(|e| e.to_string())?
}

fn answer(listener: &TcpListener, wait: Duration) -> Result<String, String> {
    let deadline = Instant::now() + wait;
    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                stream.set_nonblocking(false).map_err(|e| e.to_string())?;
                stream.set_read_timeout(Some(Duration::from_secs(5))).map_err(|e| e.to_string())?;
                let mut buffer = [0u8; 8192];
                let read = stream.read(&mut buffer).map_err(|e| e.to_string())?;
                let request = String::from_utf8_lossy(&buffer[..read]);
                let target = request.lines().next().and_then(|line| line.split_whitespace().nth(1)).unwrap_or("/");
                if !target.starts_with("/?") {
                    // A browser asking for /favicon.ico, say: not the answer.
                    let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                    continue;
                }
                let query = target[2..].to_string();
                let _ = stream.write_all(format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{PAGE}", PAGE.len()).as_bytes());
                return Ok(query);
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if Instant::now() > deadline {
                    return Err("Nothing came back from Google in five minutes, so Studio stopped waiting. Try signing in again.".into());
                }
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpStream;

    #[test]
    fn returns_the_query_of_the_redirect_and_skips_other_requests() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let port = listener.local_addr().unwrap().port();
        let browser = std::thread::spawn(move || {
            for target in ["/favicon.ico", "/?code=abc&state=xyz"] {
                let mut stream = TcpStream::connect(("127.0.0.1", port)).unwrap();
                stream.write_all(format!("GET {target} HTTP/1.1\r\nHost: localhost\r\n\r\n").as_bytes()).unwrap();
                let mut reply = String::new();
                let _ = stream.read_to_string(&mut reply);
            }
        });
        assert_eq!(answer(&listener, Duration::from_secs(10)).unwrap(), "code=abc&state=xyz");
        browser.join().unwrap();
    }

    #[test]
    fn stops_waiting_when_nothing_comes() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        assert!(answer(&listener, Duration::from_millis(300)).is_err());
    }
}
