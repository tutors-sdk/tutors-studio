# 0011. DESIGN.md (Tutors Paper) is the design contract; Impeccable is the method

**Status:** Accepted
**Date:** 2026-11-08

## Context

Studio should look like it belongs to the Tutors a lecturer already knows from the reader, not like a generic desktop tool.

## Decision

DESIGN.md is copied from the monorepo at bootstrap, noting the source commit, and owned by Studio from then on; desktop tokens Paper has no need for (sidebar width, tree rows, drop targets, OS font stacks) are added there and in src/ui/paper-tokens.css, never hard-coded. Impeccable's skills are committed under .claude/skills so every contributor and Claude session uses the same method. Three rules outrank any skill: teal is used only for the single next action on a screen; type stays within the Paper scale; every colour is a token so dark mode is free.

## Consequences

A quarterly chore PR diffs Studio's DESIGN.md with the monorepo's. /critique output is attached to UI PRs as a comment.

## Specified by

(UI rules land with the course map)
