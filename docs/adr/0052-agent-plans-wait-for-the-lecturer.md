# 0052. An assistant's plan waits for the lecturer while Studio is open

**Status:** Accepted
**Date:** 2026-11-19
**Builds on:** ADRs 0004, 0007, 0051

## Context

The design doc's third MCP rule: when an agent proposes a plan while Studio is open, Studio shows it on Check and publish and applies it only after the lecturer accepts. The agent's server (`pnpm headless <course> mcp`, started by the agent) and the window are separate processes, so they need a place both can reach that is not the course, because nothing writes to a course except `applyPlan` with a plan the lecturer accepted (ADR 0004).

## Decision

- **A new `AgentPlansPort`**, with a memory adapter (tests), a node adapter (the agent's server) and a Tauri adapter (the window). It keeps three things in Studio's config folder, beside ADR 0051's `agent-courses.json`:
  - `studio-open.json`, `{ "course", "pid" }`: the course the window has open, written when a course opens and taken away when it closes or Studio quits. The node side treats it as closed when that process is no longer running, so a crash never leaves plans waiting for a window that isn't there.
  - `agent-plans/<queue id>.json`, `{ "course", "plan" }`: one file per waiting plan, the plan as `planToJson` writes it (file contents in base64). Queue ids sort oldest first and are only `a-z`, `0-9` and `-`, so settling one can't reach another file.
- **`plan_apply` hands the plan over while the window has the course open** and answers the agent that it waits (`PLAN_WAITS`), changing nothing (STU-0205). With no window open it applies directly, as ADR 0051 decided, because the lecturer turned the switch on and the agent is acting on their behalf.
- **The window reads the queue every three seconds** while a course is open (`createAgentDesk`). A new plan puts a notice on the course; Check and publish shows each plan with every rename and write, as the next action, with **Accept** and **Turn it down**. Accept takes the plan out of the queue first, then applies it through the session's `apply`, so a second press can't apply it twice; Turn it down discards it (STU-0206). The window reads a plan again with `planFromJson`, and `applyPlan`'s `checkPlan` still refuses an unsafe one.
- **One spelling for a course**, `courseKey`: forward slashes, no slash at the end, lower case on Windows. The folder chooser and a terminal spell the same folder differently; both sides compare keys. `agent-courses.json` now holds keys too.
- **The switch is in the window**: Check and publish has "Let an assistant on this computer work on this course" for a course on disk, through new Rust commands (`agent_allowed`, `agent_set`) over the same file. The refusal an agent gets names that screen.
- The Rust side honours `STUDIO_CONFIG_DIR` as the command line does, else the app's config folder, which is the same folder for the identifier `dev.tutors.studio`.

## Consequences

- Two windows on the same computer: the last one to open a course owns `studio-open.json`. Studio opens one course at a time, so this only matters for two copies of Studio, where the plan waits in the later one.
- Waiting plans belong to this computer and never travel with the course.
- Localhost HTTP and the installed command line remain as ADR 0051 lists them.
