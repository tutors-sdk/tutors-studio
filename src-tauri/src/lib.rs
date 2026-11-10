mod fs;
mod own;
mod tool;

use std::sync::Mutex;
use tauri::{webview::PageLoadEvent, Manager};

/// Set by the release workflow's install check (ADR 0017): the installed app opens its window, loads
/// the UI and quits with status 0, so a release is only made from installers that really open.
const INSTALL_CHECK: &str = "TUTORS_STUDIO_INSTALL_CHECK";

pub fn run() {
    let install_check = std::env::var_os(INSTALL_CHECK).is_some();
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
            tool::secret_set
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tutors Studio");
}
