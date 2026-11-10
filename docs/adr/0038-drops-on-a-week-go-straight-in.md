# 0038. Files dropped on a week go straight in

**Status:** Accepted
**Date:** 2026-11-10
**Amends:** [0004](0004-plan-then-apply.md)

## Context

ADR 0004 shows every change as a plan to accept before anything is written. Dropping slides on a week then took two steps: the drop and an "Add it" press on a plan that only says each file gets its own folder. Leigh asked for a drop to put the file in the right folder silently, and chose (decision card, 2026-11-10) "Straight in, with undo" over keeping the press.

## Decision

- Files dropped on a week, chosen with the week's "Choose material", or dropped on the week in the contents (STU-0146), go straight in. The plan is still made the same way and applied through the same gate (`applyPlan`, all or nothing, recorded in the history). The lecturer's drop is the acceptance.
- Studio then says "Done: …" with "Put it back", which undoes the whole drop through the history; anything added goes to the bin, never deleted (STU-0092).
- Files Studio can't place stay in the tray with their reason, beside a line saying what went in.
- A drop on the whole course still shows its plan first: it can place a semester of material across many weeks, and is worth a look before it lands.
- STU-0147.

## Consequences

- The one exception to "nothing is written until accepted" is a gesture whose only effect is adding new folders inside a week; nothing already there is touched, so undo always restores the course.
- Arranging, fixes, the assistant's proposals and the course-wide drop keep their plan dialogs.
