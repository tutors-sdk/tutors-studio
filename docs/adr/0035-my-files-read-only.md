# 0035. My files: the lecturer's own folder, read only, beside the course

**Status:** Accepted
**Date:** 2026-11-10

## Context

Feature 5 of the next-phase document puts the lecturer's own folder of slides, notes and labs beside the course, to drag from onto a week. Studio's file access is scoped to the open course (STU-0006). The WebView has no general file access, and every path is resolved inside the course root by `fs::resolve`.

## Decision

- A new driven port, `OwnFilesPort` (`open`, `list`, `read`), reads one folder the lecturer chose. It never writes, moves or deletes.
- The Tauri adapter calls three new Rust commands in `src-tauri/src/own.rs`: `own_open`, `own_list` and `own_read`. They keep that folder in its own state and resolve every path inside it with the same `fs::resolve` guard as the course. The folder is chosen through the system folder picker. A memory adapter serves tests.
- `createMyFiles` lists the folder (folders first, hidden files left out) and reads a dragged file or folder as dropped files. The week then plans them with `planMaterial`, the same plan as a drop (ADR 0004). Copying into the course happens only through that accepted plan.
- A file left in the tray after a drop on the course can be put in a week from the plan box. That is the same plan, on the week chosen.

## Consequences

- The lecturer's own folder is never changed: no command that writes exists for it.
- In the browser preview there is no folder picker, so the panel is absent.
