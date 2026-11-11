# 0040. Files belong to what shows them

**Status:** Accepted
**Date:** 2026-11-11

## Context

Leigh asked where files such as PDFs should live, since Tutors' structure doesn't say, and asked that editing a page respects the layout Tutors provides: a PDF can be its own card or a download in the text. Reading the generator, the reader, course-rules and four real courses (edeleastar's web-dev-2, mobile and agile modules and the reference course) showed that Tutors already decides it. The generator publishes only files under a folder of a known kind, and only the types in `assetTypes`, compared case-sensitively. The reader resolves a page's relative link only under `img/`, `archives/` and `archive/`. A lab with no `img/main` takes a PDF beside its steps as the lab itself.

Studio broke this in three places. A dropped Word file became a note linking `Reading.docx` beside it, which is never published and wouldn't resolve. A PDF in a dropped lab folder landed beside the steps and replaced them. An upper-case extension (`Slides.PDF`) was kept, so the Talk showed no slides. And a lecturer writing a page had no way to add a download.

## Decision

- `docs/course-files.md` is the standard: a file belongs to the learning object that shows it. Material is its own card (Talk, Tutorial, Archive); a file a note or lab step links to is in that note's or lab's `archives/`; module-wide files are in `side/`; never a kindless folder at the root.
- **Where the lecturer puts a file decides card or link.** On a week it is a card (unchanged). In a note or lab step, the new "Attach a file" (and a drop into the page) saves it in the page's `archives/` and links it at the cursor. `AuthoringPort.attach` names the file; `planPage` takes the attachments and writes those the saved text still links, in the same plan as the page (ADR 0004, one undo). Other pages refuse, saying to drop the file on the week.
- **Studio corrects every placement** with the pure domain function `placedForTutors`, applied to the plans for a drop (`planMaterial`) and for a course made from material (`planLoadedCourse`): extensions lower-cased, files beside a note's or lab's pages moved to `archives/` and their links rewritten, unpublished types stored in a zip. Making a folder a lab (`visibleChanges`) moves its loose published files to `archives/`.
- **Zips are written in the domain** (`src/domain/zip.ts`, stored entries, CRC-32, fixed 1980 timestamp so the bytes are deterministic). No dependency is added: a stored zip is a few dozen lines, and a Word file is already compressed.
- The list of published types is copied from tutors-model-lib's `assetTypes` into `src/domain/attachments.ts`. It is data about the generator, not a message, so it doesn't conflict with "no copy about rules"; it moves to `@tutors/course-rules` if that package grows one.

## Consequences

- Courses Studio writes never hold an unreachable file. Courses made by hand can, until course-rules gains the three link checks listed in `docs/course-files.md`; those go upstream.
- `tutors-create`'s `itemLayout` still lays a Word note out the old way; Studio corrects it after the fact. When upstream changes, `placedForTutors` leaves the new layout untouched.
- An attachment chosen but whose link the lecturer deletes before saving is never written.
- A step's link to a file it named beside it in a folder made into a lab isn't rewritten (only names are known there); such a link was already broken in the reader.

## Specified by

STU-0155 to STU-0161 (`spec/features/files.feature`).
