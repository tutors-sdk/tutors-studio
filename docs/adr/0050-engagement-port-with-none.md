# 0050. An engagement port, bound to none

**Status:** Accepted
**Date:** 2026-11-19

## Context

The design doc's T2 puts engagement beside each week: how many students opened it and how long they spent. Tutors keeps that time data and serves it at `/api/time/<courseId>` to a signed-in, authorised educator from an allowed origin, pseudonymised on the way out. A desktop app has neither the session nor the origin, so Studio can't read it yet. Upstream needs either a device sign-in that gives Studio an educator's session, or a read-only token an educator makes in Educator Control and Studio keeps in the keychain. The monorepo's data layer is still moving, so this ships last.

## Decision

- **A new `EngagementPort`** in `src/application/ports/engagement.ts` with one method, `weeks()`, answering each week's folder, how many students opened something in it and the minutes they spent, or null. An adapter is bound to one course. The type has no field that could hold a name; the use case copies only those three, so an adapter that passed names along by mistake still shows none (STU-0201).
- **The default adapter is `none`** (`src/adapters/engagement/none`), a real adapter in the same sense as the `none` assistant (ADR 0005): it reads nothing, so every journey runs the same code with or without figures, and Studio shows no engagement anywhere (STU-0200). `main.ts` and `headless.ts` bind it today.
- **Beside the week, counts only.** The course home's week list shows "Opened by 42 students, 2 h 15 min in all" beside a week that has figures, and nothing beside one that doesn't. Figures for a week the course no longer has are dropped.
- The headless adapter gains `engagement`.

## Consequences

- The Tutors adapter comes after the upstream issue for read access is settled, with its own ADR for the sign-in or token and the keychain entry.
- Per-lab figures wait for the same adapter: the port can grow an `items()` method without changing `weeks()`.
