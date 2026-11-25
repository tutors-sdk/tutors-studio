# 0061. The library: folders Studio searches for courses, read only

**Status:** Accepted
**Date:** 2026-11-25
**Part of:** "Tutors Studio: a content registry" (https://claude.ai/artifact/6PTtz7VEmtP6NooJm7fsR4), phase R0

## Context

Leigh (2026-11-25) asked for a registry of Tutors content that works locally first: "a lecturer can point Studio to their local storage and discover valid Tutors courses". The design doc's answer is one model in three places: the lecturer's own library folders, folder registries, and a hosted registry. Leigh's answers in the doc: share single items, no default licence, always copy and tell the lecturer, lecturers only, and build the local version now.

Studio's file access is scoped to the open course (STU-0006) and to one folder of the lecturer's own (ADR 0035). Searching a lecturer's Documents for courses needs to read many folders at once, without opening any of them as the course.

## Decision

- A new driven port, `LibraryPort` (`list(folder, dir)`, `read(folder, path)`), reads inside a folder named on each call. It has no write. Adapters: `library/tauri` (Rust commands `library_list` and `library_read` in `src-tauri/src/library.rs`, which resolve every path inside the named folder with `fs::resolve`), `library/node` for the headless CLI, and `library/memory` for tests and the browser preview.
- Settings keeps `libraryFolders`, in the order added. Taking a folder out of the library changes nothing on disk.
- `searchLibrary` walks each folder up to six levels deep, skipping hidden folders, `node_modules`, `json`, `html` and `_site`. A folder holding a `course.md` is one course, and Studio doesn't look inside it for more (STU-0262). Each course is checked with `CourseRulesPort.validate` through a read-only view (`libraryCourseFiles`), whose writes refuse (STU-0264).
- A course with no error finding is **ready**, and lists every week, unit and item it can lend. A course with any error **needs fixing** and lends nothing until it checks out (STU-0263). Warnings never hide a course.
- A folder Studio can't read is named with why, and the others are still searched (STU-0265).
- The Library screen is reached from the start screen ("Your library"). It lists ready courses and those to fix, and opens either in Studio. `pnpm headless library <folder> ... [--items]` prints the same.

## Consequences

- The library is searched each time the screen opens. The design doc's cached index is left for later; a library of a few dozen courses is checked in seconds.
- Loose items outside any course (a `lab-docker` folder on its own) are not listed yet.
- Composing a course from library items (R1) and folder registries (R2) build on this port and the library's item list.
