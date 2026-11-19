mod agent;
mod bundle;
mod cli;
mod fs;
mod live;
mod own;
mod tool;
mod updates;

use std::sync::Mutex;
use tauri::{webview::PageLoadEvent, Manager};

/// Set by the release workflow's install check (ADR 0017): the installed app opens its window, loads
/// the UI and quits with status 0, so a release is only made from installers that really open.
const INSTALL_CHECK: &str = "TUTORS_STUDIO_INSTALL_CHECK";

/// WebView2's switches that Tauri gives every window (wry's own default), kept when more are added.
const WEBVIEW2_DEFAULT_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

/// Edge WebDriver drives the window (ADR 0047) by putting its switches, remote debugging among them, in
/// WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS and starting Studio with any others (the journeys' proxy) as
/// arguments. Tauri sets the window's browser arguments itself, and WebView2 then reads neither, so the
/// window takes them here. Without that variable or arguments the window keeps Tauri's default.
fn webview_args(variable: Option<String>, args: impl Iterator<Item = String>) -> Option<String> {
    let mut extra: Vec<String> = variable.into_iter().filter(|value| !value.trim().is_empty()).collect();
    extra.extend(args.filter(|arg| arg.starts_with("--proxy-server=")));
    if extra.is_empty() {
        return None;
    }
    Some(format!("{WEBVIEW2_DEFAULT_ARGS} {}", extra.join(" ")))
}

/// The WebView2 arguments every Studio window takes, or None for Tauri's default. Every window must take the
/// same ones: WebView2 won't open a second window on the same profile with different arguments.
pub fn window_browser_args() -> Option<String> {
    webview_args(std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").ok(), std::env::args().skip(1))
}

pub fn run() {
    let install_check = std::env::var_os(INSTALL_CHECK).is_some();
    let mut context = tauri::generate_context!();
    if let Some(args) = window_browser_args() {
        for window in context.config_mut().app.windows.iter_mut() {
            window.additional_browser_args = Some(args.clone());
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        // In-app updates only in a build that carries the update key's public half (ADR 0033); any other
        // build has no updater, and Settings says to download the new version instead.
        .setup(|app| {
            if app.config().plugins.0.contains_key("updater") {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            Ok(())
        })
        .manage(fs::CourseState(Mutex::new(None)))
        .manage(own::OwnState(Mutex::new(None)))
        .manage(live::LiveState(Mutex::new(live::Live::default())))
        .manage(updates::UpdateState(Mutex::new(updates::Pending::default())))
        .on_page_load(move |webview, payload| {
            if install_check && payload.event() == PageLoadEvent::Finished {
                println!("Tutors Studio install check: window opened and loaded {}", payload.url());
                webview.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            fs::open_course,
            fs::create_course,
            fs::save_copy,
            fs::fs_list,
            fs::fs_read,
            fs::fs_write,
            fs::fs_move,
            fs::fs_exists,
            fs::fs_remove,
            own::own_open,
            own::own_list,
            own::own_read,
            tool::run_tool,
            tool::secret_get,
            tool::secret_set,
            live::tutors_facts,
            live::tutors_serve,
            live::tutors_reader_answers,
            live::tutors_reader_start,
            live::tutors_show,
            live::tutors_refresh,
            live::tutors_note,
            live::tutors_stop,
            live::tutors_inside_present,
            live::tutors_inside_start,
            updates::update_check,
            updates::update_download,
            updates::update_install,
            agent::agent_allowed,
            agent::agent_set,
            agent::agent_opened,
            agent::agent_waiting,
            agent::agent_settle,
            cli::cli_add
        ])
        .build(context)
        .expect("error while building Tutors Studio")
        .run(|app, event| {
            // Quitting Studio stops the course server and any reader it started (ADR 0042).
            if let tauri::RunEvent::Exit = event {
                agent::quit(app);
                if let Ok(mut live) = app.state::<live::LiveState>().0.lock() {
                    live::stop_all(&mut live);
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::webview_args;

    #[test]
    fn the_window_keeps_tauris_arguments_when_nothing_is_added() {
        assert_eq!(webview_args(None, std::iter::empty()), None);
        assert_eq!(webview_args(Some("  ".into()), vec!["course".to_string()].into_iter()), None);
    }

    #[test]
    fn the_drivers_switches_and_the_proxy_go_to_the_window() {
        let args = webview_args(Some("--remote-debugging-port=0".into()), vec!["--proxy-server=http://127.0.0.1:9".to_string(), "other".to_string()].into_iter());
        assert_eq!(
            args.as_deref(),
            Some("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port=0 --proxy-server=http://127.0.0.1:9")
        );
    }
}
