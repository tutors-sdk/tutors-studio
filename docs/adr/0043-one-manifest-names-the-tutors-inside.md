# 0043. One manifest names the Tutors inside Studio

**Status:** Accepted
**Date:** 2026-11-18
**Part of:** the bundled release ("Tutors Studio: bundled release and feature overhaul", B1)

## Context

Studio runs three pieces of Tutors: the generator (`@tutors/tutors`), tutors-lite, and the course rules. Until now each was pinned by hand in more than one place:

- `src/domain/publish.ts` and `src-tauri/src/tool.rs` both named `jsr:@tutors/tutors@5.3.0` and `jsr:@tutors/tutors-lite@5.3.0`. The Rust allow-list had to agree with the TypeScript, or every build was refused.
- `src/adapters/build/tutors-gen` and `tool.rs` both named the Deno image.
- Nothing said which Tutors release those came from.

The bundled release puts the reader and a compiled tools program inside the installer as well. Those come from a Tutors release as downloaded files, so a version alone no longer pins them: the build needs to know each file's address and its checksum.

## Decision

- **`tutors-bundle.json`** at the root of the repository is the one place that says which Tutors is inside:
  - `tutors`: the tutors-mono-repo release, such as `17.1.0`.
  - `generator` and `website`: the JSR packages at their versions.
  - `deno`: the Deno the tools run on.
  - `parts`: each file the build downloads into the app, with its `url`, `sha256` and the `file` it is written to.
- **The pins are written from it** (STU-0171). `pnpm bundle pins` writes `src/domain/bundle.ts` and `src-tauri/src/bundle.rs`; nobody edits them. `publish.ts`, `tool.rs` and the tutors-gen adapter import them. CI runs `pnpm bundle pins --check`, which fails and names each pin file that differs from the manifest.
- **Every part is checked** (STU-0172). `pnpm bundle fetch` downloads each part and writes it only if its SHA-256 matches; otherwise the build fails and names the part. Nothing is downloaded at run time.
- **Settings says what is inside** (STU-0173): "This is Studio 0.1.0, with Tutors 17.1.0 inside."
- The manifest is read only by `scripts/bundle.ts` at build time. The domain gets constants, so the rings are unchanged.

## Consequences

- Moving to a new Tutors release is one edit and `pnpm bundle pins`. The manifest bot (a later step) makes that edit as a pull request when tutors-mono-repo releases.
- `parts` is empty until the static reader (B3) and the tools program (B2) are added. Until tutors-mono-repo attaches them to a release (tutors-sdk/tutors-mono-repo#601 and #603), Studio's release workflow builds them from the pinned sources instead, and the manifest records that.
- A part whose bytes change after it was pinned, even at the same address, stops the build rather than shipping something nobody tested.
