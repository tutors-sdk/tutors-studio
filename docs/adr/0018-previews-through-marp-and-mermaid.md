# 0018. Slides and diagrams are checked and previewed through two new ports

**Status:** Accepted
**Date:** 2026-11-08

## Context

Lecturers want to know a Marp deck or a Mermaid diagram works before students see it. The reader renders Marp with `@marp-team/marp-core` and Mermaid with `mermaid`; a check that uses a different renderer can pass a file the reader then breaks.

## Decision

Two new application ports, each with one adapter:

- `DiagramPort` (`check`, `draw`) in `src/adapters/diagrams/mermaid`, using `mermaid` 12.2.0 with `securityLevel: "strict"`. The course-rules V017 check reaches it through `validate(fs, root, { diagrams })`, so the message stays in `@tutors/course-rules`.
- `SlidesPort` (`render`) in `src/adapters/slides/marp`, using `@marp-team/marp-core` 4.4.0 with scripts off.

Both dependencies are pinned to the versions the reader uses. Slides are shown in an iframe with an empty `sandbox`, so a deck's HTML can't run script or reach the app.

## Consequences

Studio's verdict on a deck or diagram matches the reader's. Upgrading either renderer is a pin change in both repos. The headless adapter gains `preview <folder>`, so the scenarios run without a window.

## Specified by

STU-0012 to STU-0015 (`spec/ears/rich-content.md`).
