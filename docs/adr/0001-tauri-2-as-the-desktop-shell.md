# 0001. Tauri 2 as the desktop shell

**Status:** Proposed (Accepted when the spike's hello-world installs and opens on macOS, Windows and Linux from a tagged release)
**Date:** 2026-11-08

## Context

Studio must run on macOS, Windows and Linux. Electron ships Chromium everywhere (one rendering target, about 90 MB a platform). Tauri 2 uses the operating system's WebView (WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux) and installs in about 10 MB, at the cost of three rendering targets.

## Decision

Use Tauri 2 with a Svelte 5 front end, treated as a technology exploration: this bootstrap is the spike. Every file-system call goes through FileSystemPort, implemented over Studio's own Rust commands (src-tauri/src/fs.rs), so the UI never calls Tauri directly. Electron is the documented fallback.

## Consequences

Three WebViews mean three places a layout can differ, so the CI matrix (ADR 0010) is not optional. If a WebView difference cannot be worked around (WebKitGTK on older Linux is the likely one), the swap to Electron replaces src/adapters/fs/tauri, src-tauri and the build config, not the UI or the use cases. Signing needs an Apple developer account and a Windows certificate: a cost decision, open.

## Specified by

STU-0006
