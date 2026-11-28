# 0068. The library in Tutors

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0045](0045-the-tutors-reader-inside-studio.md), [0061](0061-the-library.md), [0066](0066-the-tutors-inside-studio-for-everyone.md)

## Context

Leigh, 2026-11-28: "When we wire the library up it would also be good to showcase the library within tutors itself from the studio option", then "Yes start it". The Library screen lists the courses in the lecturer's library folders, but Tutors on this computer shows only the open course and the courses read there before. Library folders are only ever read (STU-0264), and a course needs building before the reader can read it.

## Decision

- **A new driven port, `LibraryTutorsPort`** (`serve`, `list`, `stop`), with the use case `showLibraryInTutors` (STU-0316..STU-0320). The Library screen's **Show your library in Tutors** button drives it once a search has ended.
- **Only ready courses kept as folders on this computer go** (`showable` in the domain). Courses that need fixing, registry entries and Google Drive folders stay out: there is nothing to build them from.
- **Built from a copy** (STU-0317). Each course is copied into Studio's app cache, `library-builds/<hash of its folder>/`. Build output, `node_modules` and hidden folders are left out, and links are not followed. The copy is built with the Tutors tools bundled beside Studio, or the pinned generator with Deno, the same as the open course. Its `json/` is then served on 127.0.0.1 only, on one port each from 8300 to 8399, with the course's CORS header. A course that doesn't build is named with the generator's last lines, and the others still go (STU-0319). Building is one course at a time, says which, and can be stopped (STU-0318).
- **Listed on the reader's own home page.** Tutors' home page lists the courses kept in the browser's storage (`courseVisits`, @tutors/connect in anon mode). After opening the home page in the Tutors window (`LiveTutorsPort.home`, ADR 0066), Studio's Rust side waits for the window to show it, then runs a fixed script there. The script adds each library course (id `127.0.0.1:<port>`, credits "In your library: …"), and retitles any it listed before. It takes off the ones Studio listed last time but no longer serves, remembered in `studioLibrary` (STU-0320), and leaves every other course as it was. The courses go in as JSON, so nothing in a title runs. The page reloads only when the list changed. `mergeLibraryVisits` in the domain is the same rule, and a contract test runs the Rust script against it.
- It works with the Tutors inside Studio and with a developer's own copy (Advanced), since the script runs in whichever reader the window shows.

## Consequences

- No change to Tutors is needed. A supported way for an embedding app to hand the reader a catalogue (rather than writing its storage) would be cleaner; if the reader's storage shape changes, the contract test's fixture and the script change with it.
- Each course built takes the generator's time; a large library takes minutes, which is why it is a button and not automatic.
- Builds stay in the app cache until the next show replaces them; the operating system may clear that cache at any time, which only means building again.
