# 0045. The Tutors reader inside Studio

**Status:** Accepted
**Date:** 2026-11-18
**Part of:** the bundled release (B3). **Builds on:** [0042](0042-a-live-course-in-the-lecturers-own-tutors.md), [0043](0043-one-manifest-names-the-tutors-inside.md).

## Context

ADR 0042 shows a course live in the lecturer's own copy of Tutors: a clone of tutors-mono-repo with Node, pnpm and `pnpm install`, started with `pnpm dev`. That suits a Tutors developer, not a lecturer on a university laptop.

The reader runs in the browser only, but its root load came from a server. tutors-sdk/tutors-mono-repo#605 (issue #600) moves that load into the browser and adds a static build (`SVELTEKIT_ADAPTER=static`, fallback page `200.html`, `PUBLIC_ANON_MODE=TRUE`). Spike S1 (Studio #66) showed that build opening a course from 127.0.0.1 with no request to any server route.

## Decision

- **The reader inside Studio is the default** (STU-0176). Where this copy of Studio carries the reader's static files, Show it in Tutors builds the course and opens it in that reader, in the same Tutors window as ADR 0042, with the same rebuild and reload.
- **The lecturer's own copy moves to Advanced.** Choosing a folder there (STU-0164) uses it as before. **Use the Tutors inside Studio** forgets it. Every installer carries the reader since P2.
- **How it is served** (STU-0177). `live.rs` serves the reader's folder on 127.0.0.1, from port 8200 or the next free one up to 8209:
  - only GET and HEAD;
  - SvelteKit's `200.html` for any path that names no file;
  - no caching;
  - no CORS header;
  - a content security policy that allows only the reader's own scripts and a course served on 127.0.0.1, plus the pictures, videos, fonts and embeds a course links to on the web.

  The course is served beside it as in ADR 0042. The Node adapter for the headless CLI does the same from the folder `TUTORS_READER` names. `READER_CSP`, `READER_FALLBACK` and the port live in `src/domain/live-tutors.ts`, and a contract test holds the Rust copies to them.

- **A copy without the reader** says to install Studio again and shows nothing (STU-0178).
- **Where the files come from.** `src-tauri/tauri.reader.conf.json` adds `src-tauri/resources/reader/` to the installer as `reader/`. `pnpm bundle reader <checkout>` builds it in a tutors-mono-repo checkout at the commit that `reader` in tutors-bundle.json names. Today that is the head of #605, until a Tutors release attaches `tutors-reader-static-X.Y.Z.tar.gz` (#601). It then becomes a part in the manifest, downloaded and checked by its SHA-256. The Windows release builds it. Its install check finds `reader\200.html` and `tutors-tools.exe` beside Studio.
- **Ports and adapters.** These are new adapters for the existing `LocalTutorsPort`: `local-tutors/tauri/tauri-inside-tutors.ts` and `local-tutors/node/node-inside-tutors.ts`. They are named for their SDK, as every adapter here is. `LiveTutorsPort` gains `inside` and `forget()`, and `createLiveTutors` takes an optional `inside` port. There is no new port.

## Consequences

- A lecturer on Windows sees the course in the Tutors release Studio was tested with, with nothing else installed and no network.
- The installer grows by the reader's static files, about 7 MB.
- The reader is built from a pull request's commit until #605 merges and a release carries it. If that commit is squashed away, the manifest moves to the merged commit.
- The "production is ahead" notice (later) compares this reader's `version.json` with tutors.dev's.
