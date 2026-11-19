# 0047. Desktop journeys on Windows

**Status:** Accepted
**Date:** 2026-11-18

## Context

Nothing drove the real Studio window. `pnpm test` runs every EARS scenario over the headless adapter and mounts screens in jsdom, so a break between the screens and the Tauri side (a command not registered, a resource not bundled, a path with an accent) passed CI. The design doc (B5) makes Windows the first platform, asks for the three bundle journeys on every pull request, and for `windows-latest` to be the required check.

## Decision

- **WebdriverIO 9 (pinned, 9.33.1) through tauri-driver and Edge WebDriver**, the route Tauri documents for Windows. `@wdio/tauri-service` was looked at and not taken: it needs a Rust plugin compiled into the shipped app (`tauri-plugin-wdio`) for what it adds, and the journeys need none of it. A plain `remote()` session with `tauri:options.application` is enough.
- **The journeys are Gherkin, once.** `spec/features/journeys.feature` holds them as EARS Rules (STU-0184, STU-0185) tagged `@desktop`. `pnpm test` runs them over the headless adapter (`spec/steps/journeys.steps.ts`); `pnpm e2e:desktop` (vitest, `vitest.desktop.config.ts`) runs the same words through the window (`e2e/desktop/journeys.desktop.ts`). A behaviour is specified once and proved twice.
- **What the window can't do, the journey stands in for, and nothing else.** WebDriver can't reach the system folder chooser, so `choosesFolder` answers `plugin:dialog|open` with the folder the step names, in the page, for that session. No test-only code ships in the app.
- **Nothing else and no network, enforced.** The CI job builds the app with the tools and reader beside it (ADRs 0044, 0045), takes Deno off the `PATH`, and sends every address but this computer's to a proxy that isn't there, for the Rust side (`HTTPS_PROXY`) and the window (`STUDIO_WINDOW_PROXY`, passed to the WebView as `--proxy-server` through tauri-driver, because the driver sets `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` itself). The journeys check both and fail without them. Edge WebDriver is also told the window's WebView2 profile (`--user-data-dir`, Tauri's `%LOCALAPPDATA%\dev.tutors.studio\EBWebView`), because it waits for the DevToolsActivePort file there and would otherwise look beside the program, where WebView2 keeps nothing for a Tauri app.
- **One new job, Desktop journeys (Windows)**, on every pull request. The reader is cached by its pinned commit, so most runs don't rebuild it.

## Consequences

- Bundle journey 3, update from the previous release, needs two signed releases and waits for the update key and the first Beta (docs/testing.md).
- Making `windows-latest` and the journeys required is a branch protection setting, which a maintainer turns on.
- Reaching Publish for a course that checks out meant going through the helper. The journey found that **Check and publish** said "Ready to publish" with no way on, so it now offers **Preview and publish** as the next action (STU-0186).
- macOS needs `tauri-plugin-wdio-webdriver` (an embedded driver) and comes with P2; Linux's WebKitWebDriver could run them but Windows is first.
