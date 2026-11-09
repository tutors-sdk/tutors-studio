# 0024. The course book, and Advanced mode

**Status:** Accepted
**Date:** 2026-11-08

## Context

Studio's first screens showed a tree of folders, `.env` variable names and a rules version. Its users are lecturers who think in weeks and what students see.

## Decision

- **The course book.** The main screen is a contents list of weeks beside the open week, which leads with what students will see. Talks, labs and quizzes are listed on their week, not in the contents.
- **Advanced mode** is one switch in Settings, off by default, stored in `Settings.advanced`. `workspaceFeatures` in the domain decides what it reveals: file names, the Tutors environment settings, the rules version and the markdown editor. It adds to the basic screens and changes nothing about how they work.
- **Tokens.** `--ui-resource-*` carry DESIGN.md's resource tints onto the desktop, and `--studio-editor-font` sets the editor's face, which follows dyslexia mode.
- **Inter is bundled.** Paper names Inter, but Studio shipped no copy, so each OS showed its own fallback. `public/fonts/Inter-Variable.woff2` (Latin, SIL OFL) now sits beside OpenDyslexic.

## Consequences

`CourseMap` and `TreeRow` go. The Check and Publish screens still name Git and Netlify, because they ask for those accounts directly; plainer wording there is follow-up work.

## Specified by

STU-0053, STU-0054, STU-0058 (`spec/features/companion.feature`).
