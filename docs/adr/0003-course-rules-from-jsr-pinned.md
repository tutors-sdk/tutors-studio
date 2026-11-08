# 0003. course-rules and tutors-create consumed from JSR, pinned

**Status:** Accepted
**Date:** 2026-11-08

## Context

The rules that decide what Tutors publishes live in the monorepo (@tutors/course-rules, @tutors/tutors-model-lib). Studio must say exactly what `tutors validate` says, without becoming part of the monorepo's workspace.

## Decision

Studio depends on the monorepo only through published JSR packages at pinned versions, and never imports monorepo source. Upgrades are PRs with the changelog in the description. Only src/adapters/rules/course-rules imports @tutors/course-rules (enforced). Interim: until @tutors/course-rules 0.1.0 is published, an unchanged copy lives in vendor/course-rules (see its VENDORED.md for the source commit and how to remove it).

## Consequences

A rule change reaches Studio as a version bump, reviewed on its own. The vendored copy must never be edited; a change belongs upstream.

## Specified by

STU-0007
