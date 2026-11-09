# 0027. Standard setup is added when a course is sent

**Status:** Accepted
**Date:** 2026-11-09

## Context

A course with no `netlify.toml` or no `json/` line in `.gitignore` can't be sent cleanly, but Studio can write both exactly and a lecturer can't judge either. Showing them as problems asked a lecturer to approve something they have no way to weigh.

## Decision

This narrows ADR 0004 and doesn't replace it. With Advanced mode off, those files are no longer listed as problems. When the lecturer presses Send changes, a sentence beside the button having said setup will be added, that press accepts one plan holding only standard files the course lacks. The plan goes through `applyPlan` as every other write does, with the same checks and rollback.

Nothing is written on opening or checking a course. Renames stay separate plans, because they change what students see. A course published straight from Studio gets none of this: it uploads a finished build and doesn't need the file. Advanced mode keeps the finding, the plan and the `.gitignore` button as they were, and the headless `push` still refuses (STU-0038).

## Consequences

A wrong `netlify.toml` that already exists has no safe fix, so it is still listed.

## Specified by

STU-0076, STU-0077, STU-0078
