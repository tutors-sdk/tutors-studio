# 0065. Searching the library without holding up Studio

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0061](0061-the-library.md), [0064](0064-registries-on-google-drive.md)

## Context

Leigh added a library folder and, after ten minutes, the Library screen still said only "Looking for courses…": "right now it looks like it has just crashed". Choosing a copy of Tutors in the system's folder chooser was also "extremely slow" in the same session.

The search listed each folder through its own call to the Rust side (`library_list`), one after another, and went down six levels into everything that wasn't hidden: build output, `target`, `bin`, `obj`, `AppData` and the like, where a developer's computer holds hundreds of thousands of folders. Those commands were synchronous, and Tauri runs a synchronous command on the main thread, the thread the window and the system's folder chooser also need. Each file a check read came back as a JSON list of numbers. Nothing was said until the whole search ended, and a folder below the library folder that couldn't be opened failed the whole library folder.

## Decision

- **One look per library folder, off the main thread.** `LibraryPort` gains an optional `find(folder, look, heard, stopped)`. The Rust command `library_find` walks the folder in one call on a blocking worker: never inside a folder holding `registry.json` or `course.md`, past the depth, into a folder the look passes over, into one it can't open, or through a link or a Windows junction. It reports the folders opened and markers found through a Tauri channel every 200 folders and at each marker. What to pass over, how deep, and the markers come from the domain (`NEVER_SEARCHED`, `NEVER_SEARCHED_STARTS`, `LIBRARY_DEPTH`, `LIBRARY_MARKERS`) as arguments, so the Rust side holds no second copy. A port without `find` (memory, Node, Google Drive) is walked by `searchLibrary` with `list`, in name order as the Rust side goes.
- **Every library command is async**, so none runs on the main thread, and `library_read` answers with the file's bytes (`tauri::ipc::Response`), not JSON numbers.
- **Software folders are passed over** (STU-0303): `node_modules`, Tutors' `json`/`html`/`_site`, `target`, `dist`, `build`, `obj`, `bin`, `out`, `__pycache__`, `venv`, `site-packages`, `Pods`, `DerivedData`, `AppData`, `System Volume Information`, and any name starting `.` or `$`. A course inside one is still found when the lecturer adds that folder itself.
- **Progress, as it goes** (STU-0301, STU-0302). `searchLibrary` takes a `LibraryWatch`: `progress` hears "looking" (folders opened, courses found) and then "checking N of M"; `course` hears each course as soon as it is checked, and the Library screen lists it at once. The headless `library` command prints "Looked in … folders" and each "Checking N of M" line.
- **Stop looking** (STU-0305). `stopped` is asked as the search goes; the Library screen's **Stop looking**, or leaving the screen, ends it and keeps what was found. The Rust side is told through `library_stop`.
- **A course that can't be checked** is named with why, and the others are still listed (STU-0304).

## Consequences

- A search of a large home folder says what it is doing within a fraction of a second, and the window and folder chooser stay responsive while it runs.
- The skip list is a judgement: a lecturer who keeps courses under a folder called `build` must add that folder itself. The guide says so.
- Drive folders are still listed folder by folder; they are small, and the Drive API has no recursive listing that respects the skip list.
