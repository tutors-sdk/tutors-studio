// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK's DMA-BUF renderer draws a blank white window on many NVIDIA and some virtual-machine
    // graphics stacks. Turning it off costs little for Studio's UI and saves a lecturer that battle
    // (ADR 0017). Anyone who wants it back sets the variable themselves.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    tutors_studio_lib::run()
}
