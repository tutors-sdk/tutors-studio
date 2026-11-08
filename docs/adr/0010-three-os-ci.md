# 0010. Three-OS CI matrix on every PR, plus WebKitGTK

**Status:** Accepted
**Date:** 2026-11-08

## Context

The cross-OS requirement is only as real as the build that proves it.

## Decision

Every PR runs lint, type check, tests, the architecture and EARS gates, cargo test and a Tauri build on macos-latest, windows-latest and ubuntu-latest, plus ubuntu-22.04 for the older WebKitGTK. Journeys (WebDriver via tauri-driver, screenshots diffed per OS) join the matrix with the course-map milestone.

## Consequences

A red OS blocks the merge. A tag builds installers for all three OSes through the release workflow.

## Specified by

(journey rules land with the course map)
