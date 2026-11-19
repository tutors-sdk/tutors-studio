# 0053. The command line on this computer

**Status:** Accepted
**Date:** 2026-11-19
**Builds on:** ADRs 0044, 0051, 0052

## Context

The design doc's D2 promises `tutors-studio check`, `fix`, `save`, `publish` and `mcp` from any terminal, with "`src/headless.ts` compiled into the tools program" and a Settings button, under Advanced, that adds the command. Until now the command line needed a clone of Studio and `pnpm headless`, which a lecturer who installed Studio doesn't have.

## Decision

- **Studio's command line rides in the tools program** (ADR 0044). `pnpm bundle cli` bundles `src/headless.ts` and every package it uses into one ES module, `tools/studio.mjs` (not committed), with esbuild, now a pinned dev dependency (0.28.2, the version Vite and tsx already brought). `pnpm bundle tools` bundles it before `deno compile`, and the tools program answers `tutors-tools studio <course folder> <command>` by running it, so `deno compile` carries it and a lecturer needs neither Node nor Deno (STU-0207). Studio's version is written in at bundle time.
- **A new `CommandLinePort`** with a Tauri adapter (`cli_add` in `src-tauri/src/cli.rs`) and a memory adapter for tests. "Add the command line to this computer", shown in Settings with Advanced mode on, writes one small command beside nothing else:
  - Windows: `tutors-studio.cmd` in Studio's local data folder's `bin`, which it adds to the user's own PATH (HKCU, through PowerShell's `SetEnvironmentVariable`), read back so the answer is true.
  - macOS and Linux: `~/.local/bin/tutors-studio`, a shell script, made executable. Studio doesn't edit a shell profile; it says when that folder isn't on the path.
  - Each command runs the tools program beside the installed app as `studio "$@"`. A copy of Studio built without the tools program says so instead (STU-0208).
- `tutors-studio <course folder> mcp` is what an assistant's settings name, as `claude mcp add tutors-studio -- tutors-studio <course folder> mcp`.

## Consequences

- The tools program grows by Studio's command line (about 2 MB of JavaScript before compression).
- The command line in the tools program is exactly the one `pnpm headless` runs; the scenario compares them over the same course.
- Moving or reinstalling Studio somewhere else leaves a command that points at the old place; pressing the button again rewrites it.
