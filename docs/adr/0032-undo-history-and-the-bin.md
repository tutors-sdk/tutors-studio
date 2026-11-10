# 0032. Undo, history, and the bin

**Status:** Accepted
**Date:** 2026-11-10

## Context

The next-phase document asks for "Undo" after any change and a list of what Studio changed and when (feature 3), and for Remove to move an item "to a bin beside the course, left out of publishing. Never a hard delete." (Leigh, 9 Nov). ADR 0004 says nothing writes to a course except `applyPlan` with a plan the lecturer accepted, and plans never delete.

## Decision

- `applyPlan` returns, with a plan that applied, the steps that put it back: a move goes back; a write over a file restores what was there; a write that added a file sends it to the bin. It already computed this to roll back a failed plan.
- The authoring use case keeps the changes applied since the course was opened, newest first, in memory. `history()` lists them; `planUndo(id)` turns one into a plan the lecturer accepts like any other. Undoing an undo puts the change back again.
- Putting a change back is refused, with the file named, when a file it wrote has changed since or a folder it moved has moved again, so no later work is lost.
- **The bin is `.tutors-bin/` in the course folder.** A folder that starts with a dot is never read by the generator (`isSkippedFolder` in course-rules), so nothing in it is published, and a move inside the course keeps within Studio's path guard. The name matches `BIN_FOLDER` in the upstream rewiring planners (tutors-mono-repo, feature 15), so Studio, the CLI and Remove (feature 2) share one bin. A folder the change created, holding only what it added, goes to the bin whole; a name the bin already has is numbered (`talk-01-2`, `a-2.pdf`).
- The headless CLI gains `history` and `undo [change]`.

## Consequences

- History lasts for the session; it is not written to the course or to settings. A change made before Studio opened the course, or outside it, is not in the list.
- Nothing is ever deleted by undo. The bin grows until the lecturer empties it outside Studio.
- `.tutors-bin/` is committed by the git hand-off like any other folder, so a removed item can be recovered from history too.
