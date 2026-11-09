# Tutors Studio

A desktop app for macOS, Windows and Linux that shows a lecturer their course folder the way [Tutors](https://tutors.dev) will read it, says in plain words what is wrong, and fixes it for them.

Open a course folder and Studio draws it as a map: every folder tagged with what Tutors sees (Topic, Talk, Lab) or a red **Won't be published** badge for one Tutors would silently leave out. Click a problem to read why, in the same words `tutors validate` prints, and fix it in one click. Nothing changes on disk until you have seen and accepted the change.

Studio does not render your course (the reader does), edit your markdown (your editor does) or manage accounts.

## Preview and publish

**Preview and publish** in the course sidebar builds the course with the Tutors generator (`jsr:@tutors/tutors`, with Deno, or Deno in a container when it isn't installed). _Preview on this computer_ serves the build and the published Tutors reader in two containers (Docker or Podman) and opens `http://localhost:3000/course/localhost:8190`. _Publish to Netlify_ sends only the files Netlify doesn't hold and gives the `tutors.dev/course/<site>` link; it refuses a course with errors. From a terminal: `pnpm headless <folder> preview-here` and `NETLIFY_AUTH_TOKEN=... pnpm headless <folder> publish <site>`.

**An assistant** is optional. In Settings, choose **A model on this computer** (Ollama, free, and nothing leaves the computer; [ADR 0028](docs/adr/0028-ollama-for-a-model-on-this-computer.md)) or Claude with an API key kept in the keychain, which you then allow to read a course on its Check and publish screen ([ADR 0022](docs/adr/0022-claude-through-anthropics-sdk.md)). Each problem on the course map then gets an explanation in plainer words.

**Check and publish** lists every finding, errors first, offers **Fix all safe** as one plan, and, when the course folder is a git repository, commits and pushes with the computer's own git once the course has no errors and its `.gitignore` leaves out `json/`. From a terminal: `pnpm headless <folder> fix`, `pnpm headless <folder> ignore-build` and `pnpm headless <folder> push "Week 3 slides"`.

## Install

| Your computer                   | Download                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mac (macOS 11 Big Sur or later) | [Tutors-Studio-macOS.dmg](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-macOS.dmg)                 |
| Windows 10 or 11                | [Tutors-Studio-Windows-setup.exe](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-Windows-setup.exe) |
| Ubuntu, Debian or Mint          | [Tutors-Studio-Linux.deb](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-Linux.deb)                 |
| Any other Linux                 | [Tutors-Studio-Linux.AppImage](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-Linux.AppImage)       |

No administrator rights needed. Step-by-step help, including what to click if your computer asks to confirm: [docs/install.md](docs/install.md). Maintainers: [docs/releasing.md](docs/releasing.md).

## Status

This is the bootstrap and the Tauri spike ([ADR 0001](docs/adr/0001-tauri-2-as-the-desktop-shell.md)): open a folder, see the course map and every finding, and apply the safe renames. Guided course creation (three questions), drag-and-drop, and check-and-publish follow.

## Architecture

Ports and adapters ([ADR 0002](docs/adr/0002-hexagonal-rings.md)):

- `src/domain`: the course map, plans and their invariants. Imports nothing.
- `src/application`: the use cases and their ports, among them AuthoringPort, FileSystemPort, CourseRulesPort, AssistantPort, LocalModelsPort (Ollama), ToolHostPort, PublishPort (the git hand-off, [ADR 0021](docs/adr/0021-handing-off-through-the-computers-git.md)), SettingsPort, TelemetryPort.
- `src/adapters`: Tauri, memory and node file systems; `@tutors/course-rules`; Claude, Ollama and `none` assistants; local telemetry; the headless CLI; publishing (the Tutors generator, a Tutors reader in containers on this computer, Netlify's API, the keychain; [ADR 0019](docs/adr/0019-publishing-through-the-generator-a-container-reader-and-netlify.md)).
- `src/ui`: Svelte 5, on the Tutors Paper tokens ([DESIGN.md](DESIGN.md)).
- `src-tauri`: the Rust side. It holds the open course's root and refuses any path outside it.

The rules come from [`@tutors/course-rules`](https://github.com/tutors-sdk/tutors-mono-repo/tree/main/packages/jsr/course-rules), the same package behind `tutors validate`, so Studio and the CLI always agree ([ADR 0003](docs/adr/0003-course-rules-from-jsr-pinned.md)).

## Specification

Behaviour is specified as EARS sentences with `STU-` ids in [spec/ears](spec/ears), bound to Gherkin scenarios in [spec/features](spec/features) ([ADR 0008](docs/adr/0008-ears-specification-layer.md)).

## Develop

Node's current LTS (`.nvmrc`, 26; 22.12 or later works) from [nodejs.org](https://nodejs.org) or `nvm install`, and pnpm: `corepack enable` turns on the version `package.json` pins. `pnpm dev` needs nothing else. `pnpm tauri dev` and `pnpm test:rust` also need Rust 1.77.2 or later and the platform's webview build tools; without Rust they stop with `cargo metadata ... program not found`.

| Computer | Once, before `pnpm tauri dev`                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| macOS    | `xcode-select --install`, then `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh`                                                       |
| Windows  | Visual Studio Build Tools with "Desktop development with C++", then the installer from [rustup.rs](https://rustup.rs). WebView2 ships with Windows 11. |
| Linux    | `sudo apt install build-essential libwebkit2gtk-4.1-dev librsvg2-dev libssl-dev libdbus-1-dev`, then the rustup line above                             |

Open a new terminal after rustup so `cargo` is on the path. The first desktop build compiles the Rust side and takes a few minutes.

The app's own features need more only when you use them: Preview on this computer needs Docker or Podman, building a course uses Deno (or Deno in a container), and Commit and push uses the computer's git.

```sh
pnpm install
pnpm dev          # the UI in a browser, over a sample course
pnpm tauri dev    # the desktop app
pnpm test && pnpm test:rust && pnpm check && pnpm architecture && pnpm ears:audit
```

See [CLAUDE.md](CLAUDE.md) for the rules every change follows.
