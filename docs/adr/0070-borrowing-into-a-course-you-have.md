# 0070. Borrowing into a course you have, and a library that remembers

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0004](0004-plan-then-apply.md), [0061](0061-the-library.md), [0062](0062-composing-a-course-from-the-library.md)

## Context

Leigh, 2026-11-28, after adding a library and picking from it: "it should be usable in any course that I have rather than a brand new course. When I go back in after I add a library it does the add / scan again, can we cache it? From a UI perspective I should be able to 'import a module' from a known course and have it wire in but more importantly copy the course content into the right folder locally."

ADR 0062 made picks into a new course only, and left "adding library items to an existing course" as a later step. The Library screen also looked through every library folder each time it opened, which takes minutes over a large folder.

## Decision

- **Your library on every screen** (STU-0335). The bar at the top of every screen has **Your library** beside Back and Home. Opened while a course is open, the library adds picks to that course; opened from the start screen, it makes a new course from them, as before.
- **Picks go where the lecturer says** (STU-0332). With a course open, a ready course lends whole units as well as weeks and items. Each pick shows a **Goes in** list drawn from the open course's map:
  - a unit: a new unit at the end of the course;
  - a week: a new week at the end of the course, a unit's next week, or into a week, whose items it joins;
  - an item: a week, or the module's own unit.
- **One plan, applied to the open course** (STU-0333). `planBorrow` reads the library and the course, and copies each pick in under the next free number of its kind (`copiedName`, ADR 0062), so nothing already in the course is overwritten. The plan carries a copy notice, as compose plans do. It is applied through the course's own `apply`, so it is in Changes and can be undone (ADR 0004).
- **Credits kept across borrows** (STU-0334). Each copy is added to `.tutors/sources.json`, keeping what is there. The Borrowed material page is rewritten from the whole record: wherever an earlier borrow put it, else in the module's own unit, else at the top of the course.
- **The library remembers** (STU-0328 to STU-0331). What a complete look finds is kept in the settings (`libraryFound`, with when Studio looked). Opening the library shows it at once and says when Studio last looked; **Look again** looks through every folder. Adding a folder looks only in it, and taking one out drops what was found there. A look the lecturer stopped isn't kept, because it didn't see everything.
- `pnpm headless borrow <course folder> --from <library folder> --pick "<course>:<item>@<folder in the course, or end>"` does the same as the app.

## Consequences

- The remembered library can be out of date when a course in a library folder changes outside Studio. Borrowing always reads the files as they are now, so a stale list never copies old content. Look again refreshes the list.
- Updating a copy from its original, which the sources record makes possible, is still a later step.
