# 0026. Writing in plain language: TipTap, kept as markdown, saved through a plan

**Status:** Accepted
**Date:** 2026-11-09

## Context

Lecturers who don't know markdown still have to write their pages: lab steps, notes, a talk's summary. Leigh asked that they "type in normal language and we convert to md". The markdown editor (ADR 0025) stays for Advanced mode. Basic mode needs a word-processor-style editor that writes the same markdown every time, so a page written in Studio and one written by hand look the same in Tutors.

## Decision

- **Editor:** TipTap 3 (`@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`), pinned exactly at 3.32.0. TipTap is ProseMirror with a small API and accessible, contenteditable text input. Studio loads it only when the editor opens. Lecturers get headings, bold, italic, bullet and numbered lists, quotes, inline code and code blocks, links and pictures with a description.
- **Markdown:** `@tiptap/markdown` 3.32.0, which parses with marked and serialises from the document. A page it can read is written back the same: the round trip is tested on a typical lab step (STU-0072).
- **What it can't keep:** front matter, HTML, tables, footnotes, reference links, checklists and maths have no plain form, so saving would drop them. `plainWritingProblem` in the domain names these when the page opens. The page then stays with the markdown editor, and Studio says so (STU-0073).
- **Saving:** through `planPage`, the same plan as ADR 0025. It refuses when the file changed after it was opened, and nothing is written until the lecturer accepts.

## Consequences

The plain view shows the page as it reads, not as the Tutors reader draws it: relative pictures don't load, and Tutors' own extensions aren't drawn. Preview and publish remains the way to see the real thing. Claude drafting a page ("Describe what you want") builds on this editor and comes next.

## Specified by

STU-0072 and STU-0073 (`spec/features/writing.feature`).
