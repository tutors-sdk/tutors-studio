# 0044. The Tutors tools beside Studio

**Status:** Accepted
**Date:** 2026-11-18
**Part of:** the bundled release (B2). **Builds on:** [0043](0043-one-manifest-names-the-tutors-inside.md). **Amends:** [0019](0019-publishing-through-the-generator-a-container-reader-and-netlify.md), which ran Deno in Docker or Podman when Deno was missing.

## Context

Building a course needed Deno, or Docker or Podman to run Deno's image. A lecturer on a university Windows laptop rarely has either, and installing Docker Desktop needs administrator rights. The first build also fetched the generator from JSR, so it needed the network.

Spike S2 (Studio #66, 2026-11-18) compiled the generator and tutors-lite into one program with `deno compile` on `windows-latest`: about 50 MB zipped, 30 seconds to compile. It wrote the same `json/` and `html/` as `deno run jsr:...` for both corpus courses, including from a folder whose path has spaces and accents.

## Decision

- **A tools program.** `tools/main.ts` is written by `pnpm bundle pins` from tutors-bundle.json. `tutors-tools build` imports the pinned generator and `tutors-tools website` imports tutors-lite, each in the current folder. `pnpm bundle tools` compiles it with the pinned Deno to `src-tauri/binaries/tutors-tools-<target>`.
- **It ships as a Tauri sidecar.** `src-tauri/tauri.tools.conf.json` adds it as `externalBin`. The Windows installer and the Windows CI build use that config. Tauri places it beside Studio's own program.
- **Studio prefers it** (STU-0174). The `ProcessPort` gains the tool `tutors-tools`. `tool.rs` runs it only from beside Studio and only as `build`, `website` or `--version`. The tutors-gen adapter uses it when it answers `--version`, and Deno with `jsr:` otherwise. That covers development, the headless CLI and, for now, macOS and Linux. The headless CLI runs the program that `TUTORS_TOOLS` names.
- **Containers are gone.** Docker and Podman are no longer run, and `tool.rs` refuses them. A copy with neither its tools nor Deno builds nothing and says to install Studio again (STU-0175).
- **Validation stays with Deno** until the tools carry `validate`. The pinned validator is still null (ADR 0034).

## Consequences

- On Windows a course builds with nothing else installed and with no network, using the Tutors the release was tested with.
- The installer grows by about 50 MB. Antivirus judges the tools program as a separate executable, so it is signed with the app (B6).
- When tutors-mono-repo attaches its own `tutors` program to a release (tutors-sdk/tutors-mono-repo#603), it replaces `tools/main.ts`. It becomes a part in tutors-bundle.json, downloaded and checked like any other, and adds `validate`.
- macOS and Linux get the sidecar in P2. A universal macOS build needs a universal tools binary.
