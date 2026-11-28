# 0066. The Tutors inside Studio for everyone, a developer's own copy in Advanced mode

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0042](0042-a-live-course-in-the-lecturers-own-tutors.md), [0045](0045-the-tutors-reader-inside-studio.md), [0024](0024-course-book-and-advanced-mode.md)

## Context

Leigh's feedback on 2026-11-28:

- "I thought we packaged tutors into the app? This is asking me to choose my copy of tutors … Advanced users should have the option to pick the dev version of tutors so it can allow us test features. We should default to the in built version for non tech users."
- "When the studio launches and tutors is packaged … have a side button to say view Tutors locally, then a side button in a course to say view my course in tutors."
- The reader Studio opens shows only the course ("a very weird URL http://localhost:5173/course/127.0.0.1:8190"); "is there a way to show the general reader homepage as well".
- "Ready to publish has the claude and assistant screens, they should be gated behind a setting for advanced users … it should show they have it enabled somehow."

Every installer has carried the reader since P2 (ADR 0045), but `pnpm tauri dev` copies no resources, so Studio run from source found no reader and fell back to asking for the lecturer's own copy, whether or not Advanced mode was on.

## Decision

- **The Tutors inside Studio is the only Tutors outside Advanced mode** (STU-0309). `createLiveTutors` takes `ownAllowed` (Advanced mode in the app; always in the headless CLI). With it off, a copy chosen before is set aside, and a Studio without the reader says to install Studio again; it never asks for a folder.
- **A developer's own copy is an Advanced choice** (STU-0310), unchanged from ADR 0042, offered as a way to try Tutors features before they are released.
- **A source build finds a reader too.** A debug build also looks for the reader in `src-tauri/resources/reader`, and `pnpm bundle reader` with no checkout named fetches tutors-mono-repo at the pinned commit into `.cache/` (ignored) and builds it there.
- **Tutors' home page** (STU-0311). `LocalTutorsPort` gains an optional `home(folder)`: the reader running with no course served, and the link to its home page, which lists the courses read in it. `LiveTutorsPort.home()` opens it in the Tutors window. Studio's Rust side lets that window show a reader's home page on 127.0.0.1 or localhost (`is_reader_home`, mirrored by `isReaderHome`) as well as a course on this computer.
- **Side buttons.** The start screen has **View Tutors locally** beside it (STU-0311); a course's contents have **View my course in Tutors** (STU-0312), which builds the course and shows it, live from then on, as the Publish screen's **Show it in Tutors** does.
- **Assistants are Advanced** (STU-0306). The Check and publish screen offers the switches that let Claude read a course's problems and an assistant on this computer work on it only in Advanced mode. Plans an assistant left waiting are still shown, so nothing it asked for is hidden.
- **Advanced mode says who it is for and that it is on** (STU-0307, STU-0308): beside its switch and as it turns on, "for people comfortable with technology and the command line"; and while it's on, the status bar on every screen says **Advanced mode is on**, with **Turn it off in Settings**.

## Consequences

- A lecturer never meets a question about tutors-mono-repo. A Studio developer runs `pnpm bundle reader` once, or turns on Advanced mode to use their own clone.
- Showing the library inside Tutors itself, which Leigh also asked for, needs each library course built and served, and the reader to list them; that is left for a later change.
- Lecturers who had turned on Claude without Advanced mode lose its switch until they turn Advanced mode on; their choice for each course is kept.
