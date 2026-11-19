# 0056. Loading a course exported from a learning platform

**Status:** Accepted
**Date:** 2026-11-19
**Builds on:** ADRs 0003, 0042

## Context

Most lecturers' material lives in a learning platform, not a folder. The design doc's D3 asks Studio to load a Moodle course backup (`.mbz`) or an IMS Common Cartridge (`.imscc`), the export Canvas, Blackboard, Brightspace and Moodle all offer. Sections become weeks, files go through the material planner, and anything unplaced waits in the tray.

The reader belongs upstream in `tutors-create`, beside `tutors import`, so the command line gains it too: tutors-mono-repo issue #611, PR #612. Merging upstream needs another maintainer, and Studio does not wait for it.

## Decision

- **The reader is #612's, unchanged.** `archive.ts` and `course-archive.ts` are copied byte for byte from tutors-sdk/tutors-mono-repo PR #612 at e95b89c into `vendor/tutors-create/src`, as the rest of that folder was copied from open PRs #581 to #588 (`VENDORED.md`). `@tutors/tutors-create/archive` names `course-archive.ts`. When #612 merges, nothing changes; when `@tutors/tutors-create` is on JSR, the folder goes, as ADR 0003 says.
- **`CourseRulesPort.unpackExport(name, bytes)`** answers an export as the folder of material it holds, laid out as `tutors import` reads it (`Week NN <section>/`), or why it can't be read, or null for any other file. The course-rules adapter stays the only file that imports tutors-create.
- **`unpackExports`** in the load use case replaces each export in a loaded folder with its material, beside where the export was, before the course is planned (STU-0222). The first export Studio can't read stops the load, named, and nothing is created (STU-0223). The folder loaded is still only read.
- **fflate 0.8.3, pinned,** answers the reader's two `node:zlib` calls (`gunzipSync`, `inflateRawSync`) in the webview, which has no `node:zlib`. Vite resolves `node:zlib` to `src/adapters/rules/course-rules/zlib.ts`. fflate has no dependencies and is MIT licensed.

## Consequences

- A lecturer loads a folder holding the export; the chooser is still a folder chooser.
- Forums, quizzes and assignments have no file to carry over and are left out, as `tutors import` leaves them.
- What belongs to no week (Moodle's General section) is listed as left out. It is inside the export, not the folder, so the lecturer adds it by hand.
