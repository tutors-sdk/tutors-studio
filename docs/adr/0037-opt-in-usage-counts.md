# 0037. Opt-in usage counts, kept on the computer

**Status:** Accepted
**Date:** 2026-11-10

## Context

The next-phase document lists "evidence (opt-in usage counts)" as an enabler: knowing how often lecturers publish, save, accept a change, send with Git and take an assistant's proposal, so the phase after rests on use rather than guesses. `TelemetryPort` already names these events, but `LocalTelemetry` only keeps them in memory for the session, and there is nowhere agreed to send anything. Issue #53 tracks the gap.

## Decision

- A new driving port, `UsagePort`, behind a "Usage counts" section in Settings: a checkbox (off by default), each counted event in a lecturer's words with its count, and "Copy the counts".
- `countingTelemetry` wraps the telemetry adapter. Every event still goes to it, and when counting is on, an event named in `countedEvents` (domain/usage.ts) adds one to its count in the settings store. Events' details (file counts, plan ids) are never kept, and failures, checks and unknown names are never counted.
- The counted events are `publish.done`, `course.saved`, `website.saved`, `plan.applied`, `handoff.pushed`, and two new ones the proposals use cases emit: `assistant.drafted` and `assistant.suggested`.
- Turning counting off clears the counts.
- "Copy the counts" puts JSON on the clipboard: Studio's version and the counts by event name, nothing else. Studio sends nothing itself: the lecturer pastes it where they choose.
- STU-0140 to STU-0143.

## Consequences

- No network, no account and no endpoint to run: the counts reach the team only when a lecturer sends them.
- When Leigh chooses a destination, a sending adapter can read `UsagePort.report()` behind its own opt-in and its own ADR, without changing what is counted.
- A new event becomes counted only by adding it to `countedEvents`, in the lecturer's words, so the list in Settings is always the whole list.
