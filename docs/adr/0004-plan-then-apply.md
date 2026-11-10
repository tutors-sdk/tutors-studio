# 0004. Plan-then-apply for every write

**Status:** Accepted
**Date:** 2026-11-08

## Context

Studio moves and writes a lecturer's files, and will let a model and an external agent propose changes. A half-applied change or a surprise write would destroy trust.

## Decision

No adapter writes on its own initiative. Every change is a Plan of FileOps (write, move) that is shown to the lecturer, accepted, checked whole (safe paths, no two ops on one target), then applied by applyPlan in order. If an op fails, every op already applied is undone in reverse and the result names the file that blocked it.

## Consequences

Fixes, drops, drafts and MCP calls all share one gate and one rollback path. Property tests assert that a plan failing at any op leaves the course byte-for-byte as it was.

## Specified by

STU-0001, STU-0004, STU-0006. Amended by ADR 0038 for files dropped on a week.
