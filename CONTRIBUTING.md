# Contributing to Tutors Studio

Thank you for helping. Studio is a desktop app for lecturers, so every change is judged by what a lecturer sees and whether their course stays safe.

## Your first green test

1. Clone the repository, then run `pnpm run doctor`. It checks Node, pnpm, Rust and your system's webview build tools, and says how to fix anything missing. (Plain `pnpm doctor` is pnpm checking itself.)
2. `pnpm install`, then `pnpm test`. On a Windows computer with nothing cached this takes a few minutes; CI times it on every pull request (the "First green test" job's summary).
3. `pnpm dev` shows the UI in a browser over a sample course. `pnpm tauri dev` runs the desktop app; the first build compiles the Rust side and takes a few minutes more.

Windows is the documented path, because most lecturers use it: Visual Studio Build Tools with "Desktop development with C++", rustup, Node and pnpm, as the [README](README.md#develop) lists. macOS and Linux work too.

## How a change is made

[CLAUDE.md](CLAUDE.md) holds the rules every change follows, whoever writes it. In short:

- **Spec first.** A change in behaviour starts as an EARS sentence with a new `STU-` id in `spec/ears/` (`pnpm ears:audit --next-id` gives the next one), the same sentence as a tagged `Rule:` in `spec/features/`, and steps in `spec/steps/` that drive the headless adapter. Ids are never reused.
- **Rings.** `src/domain` imports nothing, `src/application` only the domain, each adapter its port, the domain and one SDK. `pnpm architecture` checks it.
- **Plan, then apply.** Nothing writes to a course except a plan the lecturer accepted ([ADR 0004](docs/adr/0004-plan-then-apply.md)).
- **Words.** Messages about a course come from `@tutors/course-rules`. Studio's own words are plain English for a lecturer: no jargon, no file names unless Advanced mode is on.
- **Size.** A Svelte component stays at 600 lines or fewer; a screen that grows past that is split by screen. `App.svelte` and `NodeDetail.svelte` are over it and may only shrink (`tests/architecture/component-size.test.ts`).
- **Design.** Colours, spacing and sizes come from `src/ui/paper-tokens.css` and [DESIGN.md](DESIGN.md). Teal marks the one next action on a screen.
- **Decisions.** A new port, adapter, MCP tool, token or unpinned dependency needs an ADR in `docs/adr/`.
- **Upstream.** `vendor/` holds unchanged copies of Tutors packages; changes to them go to [tutors-sdk/tutors-mono-repo](https://github.com/tutors-sdk/tutors-mono-repo).

Before you open a pull request:

```sh
pnpm test && pnpm check && pnpm architecture && pnpm ears:audit && pnpm format:check
pnpm test:rust   # when you touched src-tauri
```

CI runs these on Linux, macOS and Windows, builds and installs the app on each, and drives the real window on Windows (`pnpm e2e:desktop`, [docs/testing.md](docs/testing.md)).

## Where things are

- `docs/guides/`: the lecturer's guide, screen by screen. Change it with the screen.
- `docs/adr/`: every decision, numbered. Read the ones your change touches.
- [docs/architecture.md](docs/architecture.md): the C4 views, the rings and the trust boundaries.
- `pnpm headless <course> ...`: Studio without a window, for trying a change from a terminal ([guide 11](docs/guides/11-command-line.md)).
