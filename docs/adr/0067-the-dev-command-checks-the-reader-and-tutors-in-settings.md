# 0067. The dev command checks the reader; Tutors in Settings for developers

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0045](0045-the-tutors-reader-inside-studio.md), [0066](0066-the-tutors-inside-studio-for-everyone.md)

## Context

After ADR 0066, `pnpm tauri dev` shows courses in the Tutors inside Studio only once `pnpm bundle reader` has run. Leigh, 2026-11-28: "Can we adjust the dev command to always check if bundle has been run? If not to prompt to run it. Developers using advanced mode should be able to override the tutors install location in settings to choose a dev version for experimental features. This should allow us connect and launch it from the settings menu and show them what tutors they are using and allow them to stop it or switch it."

## Decision

- **`pnpm tauri` goes through `scripts/tauri.ts`** (STU-0313). Before `dev`, the script checks `src-tauri/resources/reader`. If there is no `200.html` there, or its `.studio-reader-commit` stamp (written by `pnpm bundle reader`) names a different commit from `tutors-bundle.json`, it says so. In a terminal it then asks whether to run `pnpm bundle reader` now (Enter means yes). Where nobody can answer, such as CI or a pipe, it says how to build the reader and carries on. Every other `pnpm tauri` command goes straight to the Tauri CLI unchanged.
- **Tutors on this computer, in Settings, in Advanced mode** (STU-0314, STU-0315). `TutorsSetting.svelte` shows:
  - which Tutors is in use: the one inside Studio and its release, or the lecturer's own copy (`tutorsInUse` in the domain);
  - **Start Tutors**, which opens its home page in the Tutors window, and **Stop Tutors**;
  - **Choose your copy of Tutors…**, **Use another copy…** and **Use the Tutors inside Studio**.

  Switching first stops the Tutors that is running, so the next start uses the copy just chosen. It drives the app's `LiveTutorsPort` with no course open. `home()` now records the Tutors it opened, so **Stop** stops it.

- **No new port.** The app gets one `LiveTutorsPort` with no course (`tutors` in `AppProps`), used by both the start screen's **View Tutors locally** and Settings.

## Consequences

- A fresh clone asks once and then starts with the reader inside it. After that, `pnpm tauri dev` only asks again when the manifest moves to a new Tutors commit.
- When Tutors releases carry the static reader (tutors-sdk/tutors-mono-repo#601), `pnpm bundle reader` can fetch the release asset instead of building a checkout, and this check stays the same.
