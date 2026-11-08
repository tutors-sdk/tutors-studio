# 0017. Installing Studio without a fight

**Status:** Accepted
**Date:** 2026-11-08

## Context

Studio is for lecturers who are not developers. Every extra choice or warning between the download and the open window is a support request, and university laptops often deny administrator rights. The bootstrap release workflow uploaded every bundle Tauri makes (about ten files with version and architecture in their names), unsigned, and never checked that any of them installs.

## Decision

- **One file per computer, plainly named, at a permanent link.** `Tutors-Studio-macOS.dmg` (universal: Intel and Apple silicon), `Tutors-Studio-Windows-setup.exe`, `Tutors-Studio-Linux.deb` and `Tutors-Studio-Linux.AppImage`, served from `releases/latest/download/`, so docs/install.md and any web page link once and never go stale. The Windows `.msi` is attached for IT departments only.
- **No administrator rights.** The Windows setup installs for the current user (NSIS `installMode: currentUser`) and fetches WebView2 silently if a machine lacks it. The `.deb` declares its libraries, so the Software app installs them. macOS is drag to Applications.
- **Installed and opened before it is released.** Each installer is installed on a fresh GitHub runner with nothing preinstalled (macOS, Windows setup and MSI, Ubuntu 22.04 and 24.04 deb, AppImage) and opened. Setting `TUTORS_STUDIO_INSTALL_CHECK` makes Studio quit with status 0 once its window has loaded the UI, so a crash, a missing library or a blank WebView fails the run. The check also asserts the macOS app is universal, the disk image has its Applications shortcut, the Windows setup leaves a Start menu shortcut and a per-user entry in Settings > Apps, and uninstalling removes it. The release job is gated on all of it, and the same build and check run on any pull request that touches packaging.
- **The tag must match the version** in package.json, tauri.conf.json and Cargo.toml, so the installer never names the wrong version.
- **Linux blank-window guard.** Studio turns off WebKitGTK's DMA-BUF renderer unless the user set `WEBKIT_DISABLE_DMABUF_RENDERER` themselves; it draws a white window on many NVIDIA and virtual-machine graphics stacks.
- **Unsigned for the first term (decided 2026-11-08); signing switches on by secret.** macOS signing and notarisation run when the Apple secrets exist (docs/releasing.md), and the install check then requires Gatekeeper to accept the app. The Windows route (Azure Trusted Signing or an OV certificate) is wired once chosen. Until then the macOS app is signed ad hoc, because Apple silicon calls a wholly unsigned app "damaged" with no way past it, and docs/install.md walks through the one-time confirmation on each OS.

No new runtime dependency, port or adapter is added.

## Consequences

A release takes longer (build, then six install checks) but cannot ship an installer that does not open. Packaging pull requests take about as long as a release build.

In-app updates (the Tauri updater plugin, which needs its own signing key and an update-offer screen the lecturer accepts) are the next step and need their own ADR and STU rules; until then a lecturer updates by downloading from the same link and installing over the top.

The install check proves an installer installs and opens on a clean machine; it does not prove the course workflows, which the journeys cover (ADR 0010).

## Specified by

Release workflow `install-check` job (installation is outside the app, so it is checked by the workflow rather than EARS scenarios over the headless adapter).
