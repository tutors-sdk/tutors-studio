# 0062. Composing a course from the library: always a copy

**Status:** Accepted
**Date:** 2026-11-25
**Builds on:** ADRs 0004, 0061
**Part of:** "Tutors Studio: a content registry", phase R1

## Context

The registry's purpose is to let Studio "dynamically create a course by selecting content" (Leigh, 2026-11-25). The design doc left open whether a composed course copies what it borrows or links to it. Leigh's answer: "always copy and inform the lecturer that is what you do". The smallest thing to share is one item.

Tutors builds a course from one folder, and the reader resolves a page's files only inside its own learning object's folder (docs/course-files.md). So a copied week or item works in its new course with nothing rewritten.

## Decision

- **Composing is a new course.** On the Library screen, **Pick from it** lists a ready course's weeks and items. The lecturer picks any of them, says which week each goes in (or the module's own unit), names the course, and presses **See the plan**. Units and side units are containers and can't be picked; their weeks and items can.
- **One plan, as New course makes it** (STU-0266). The course's own files come from `newCourseFiles` with empty weeks, so a composed course has the same root files, side unit and units as any other. A picked week fills that week: its page gives the week its title, and its items keep their names unless one of that kind already has the number. A picked item takes the next free number of its kind (`copiedName`). Hidden files stay behind. Nothing is written until the lecturer accepts, and the course is made in a new folder (ADR 0004).
- **Always a copy, and said so** (STU-0267). Every compose plan carries the sentence "Studio copies each item into your new course. Your course gets its own copy: changing it won't change the original, and later changes to the original won't reach your course."
- **Where it came from** (STU-0268). `.tutors/sources.json` records, for each copy, the library folder, course and path it came from, the source course's title, the day, and a SHA-256 digest of its files (paths and bytes, in path order). Tutors skips dot folders, so it is never published. The digest lets a later version tell the lecturer that the original, or their copy, has changed.
- **Credits** (STU-0269). A **Borrowed material** note in the side unit lists each copied item, the course it came from and the day. It is written from the sources record.
- **Nothing from a course that needs fixing** (STU-0270). The library lends only ready courses' items, so the headless command refuses a pick from one, naming the course.
- `pnpm headless compose <parent> --name ... [--lecturer ...] [--weeks N] --from <library folder> --pick "<course>:<item>@<week>" ...` makes the same course.

## Consequences

- Adding library items to an existing course, and offering updates from the sources record, are later steps.
- Licences are not checked when composing: Leigh chose no default licence, and library courses are the lecturer's own or their colleagues'. Sharing to a registry (R2) is where a licence matters.
