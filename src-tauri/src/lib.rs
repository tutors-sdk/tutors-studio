mod fs;

use std::sync::Mutex;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(fs::CourseState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            fs::open_course,
            fs::fs_list,
            fs::fs_read,
            fs::fs_write,
            fs::fs_move,
            fs::fs_exists,
            fs::fs_remove
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tutors Studio");
}
