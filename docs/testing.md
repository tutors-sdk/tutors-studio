# Testing Studio

| Command            | What it runs                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `pnpm test`        | domain, application, contract and screen tests, and every EARS scenario in `spec/` over the headless adapter     |
| `pnpm test:rust`   | the Rust side's tests                                                                                            |
| `pnpm ears:audit`  | the EARS register, the feature files and the steps agree                                                         |
| `pnpm e2e:desktop` | the bundle journeys through the real window: each Rule tagged `@desktop` in `spec/features/` (ADR 0047), Windows |

## Desktop journeys

`spec/features/journeys.feature` holds the design doc's bundle journeys. `pnpm test` runs them over the headless adapter (`spec/steps/journeys.steps.ts`). `pnpm e2e:desktop` runs the same words through the Studio window (`e2e/desktop/journeys.desktop.ts`), with WebdriverIO driving it through tauri-driver and Edge WebDriver. CI runs them on every pull request as **Desktop journeys (Windows)**.

To run them on a Windows computer:

1. Build the app with the Tutors tools and the reader beside it: `pnpm bundle tools`, `pnpm bundle reader <your tutors-mono-repo checkout at the pinned commit>`, then `pnpm tauri build --debug --no-bundle --config src-tauri/tauri.tools.conf.json --config src-tauri/tauri.reader.conf.json`.
2. Install the driver: `cargo install tauri-driver --locked`, and an Edge WebDriver matching your WebView2 (`cargo install --git https://github.com/chippers/msedgedriver-tool`, then run `msedgedriver-tool`). Set `TAURI_NATIVE_DRIVER` to the `msedgedriver.exe` it saved.
3. Take Deno off the `PATH`, and turn the network off for the run: `HTTPS_PROXY` and `HTTP_PROXY` set to `http://127.0.0.1:9`, `NO_PROXY=127.0.0.1,localhost`, and `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--proxy-server=http://127.0.0.1:9`. The journeys check both and fail if either is missing.
4. `pnpm e2e:desktop`. `STUDIO_APP` names another build of the app.

The system's folder chooser can't be driven by WebDriver, so a journey answers it with the folder the step names (`choosesFolder` in `e2e/desktop/window.ts`). Every other press is the lecturer's: a button by the words on it, a choice by its label.

A journey's folders are made under `RUNNER_TEMP` (or the system's temporary folder), in a folder whose name has spaces and accents, as a OneDrive folder does.

## Not yet journeys

- **Update from the previous release** (bundle journey 3) needs two signed releases to update between. It joins the install check in the release workflow once the update key exists and the first Beta is out ([releasing.md](releasing.md)).
- macOS needs an embedded WebDriver plugin in the app and comes later; Linux's WebKitWebDriver works but isn't run, because Windows is first (the design doc).
