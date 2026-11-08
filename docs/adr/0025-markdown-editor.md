# 0025. The markdown editor: CodeMirror, markdown-it, and saving through a plan

**Status:** Accepted
**Date:** 2026-11-08

## Context

Advanced mode needs a real source editor with a preview, and ADR 0004 still holds: nothing writes to a course except an accepted plan.

## Decision

- **Editing:** CodeMirror 6, pinned exactly and loaded only when the editor opens. It brings line numbers, undo and accessible text input. It leaves Tab alone, so keyboard users can move out of it.
- **Preview:** a new driven port, `MarkdownPort`, with one adapter, `markdown/markdown-it`, pinned exactly. It runs with `html: false`, so a page's raw HTML shows as text and a preview can't run markup.
- **Saving:** `planPage` compares the page on disk with the text that was opened. If they differ it refuses, so an outside change isn't overwritten. Otherwise it returns a one-file write plan the lecturer accepts.

## Consequences

The preview is a plain rendering, not the Tutors reader: relative images don't load and Tutors' own extensions aren't drawn. Preview and publish remains the way to see the real thing.

## Specified by

STU-0055..STU-0057 (`spec/features/companion.feature`).
