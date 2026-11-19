# 0051. The MCP tools, and the switch that lets an agent in

**Status:** Accepted
**Date:** 2026-11-19
**Builds on:** ADR 0007

## Context

ADR 0007 decided Studio is an MCP server: the authoring use cases as tools, `plan.apply` the only writer, no raw file writes. The design doc's D2 adds two more rules: a lecturer must let an assistant on their computer work on a course before any tool answers, and an agent's plan proposed while Studio is open appears on Check and publish and applies only when the lecturer accepts.

## Decision

- **The first `ToolHostPort` adapter**, `src/adapters/tool-host/mcp`, on `@modelcontextprotocol/sdk` 1.32.2 (pinned). It uses the SDK's low-level `Server` with JSON schemas written beside each tool, so the adapter needs no second library.
- **Thirteen tools.** Five read: `course_map`, `course_check`, `course_details`, `course_outcomes`, `course_term`. Seven propose a plan and keep it: `propose_fix_all`, `propose_arrange`, `propose_details`, `propose_outcomes`, `propose_tag`, `propose_release`, `propose_show_due`. One writes: `plan_apply`, which applies a plan a propose tool made in the same session, once (STU-0202, STU-0203). Names use `_`, not ADR 0007's `plan.apply`, because agents' tool names (Claude's included) allow only letters, digits, `_` and `-`. A propose tool answers the plan's summary and the paths it writes or moves, never file contents. `tests/contract/mcp-tools.test.ts` pins the list; changing it needs an ADR.
- **The switch is a new `AgentAccessPort`**, "Let an assistant on this computer work on this course". It's kept per computer, not in the course, so a course shared or pushed never carries it. The node adapter keeps `agent-courses.json` (`{ "courses": [<folder>, ...] }`) in Studio's settings folder for the Tauri identifier `dev.tutors.studio` (`%APPDATA%`, `~/Library/Application Support` or `$XDG_CONFIG_HOME`), where the app's Rust side will read and write the same file. Every tool call asks it first and is refused while it is off (STU-0204).
- **The headless adapter serves it**: `pnpm headless <course> mcp` over stdio, and `allow-assistant on|off` for a lecturer working only from a terminal. Turning it on that way is the lecturer's own act on their own computer.

## Not yet (the next pull request)

- ~~The app's side~~: done in ADR 0052 (the switch on Check and publish, the Rust commands, and an agent's plan waiting for Accept while Studio has the course open).
- Localhost HTTP: `serve("http")` refuses for now.
- ~~The installed command line~~: done in ADR 0053 (`tutors-studio <course> mcp` from any terminal).

## Consequences

- An agent can do nothing a lecturer can't, and nothing at all on a course the lecturer hasn't opened to it on this computer.
- New authoring use cases don't become tools by themselves: each is added here, with its schema, under an ADR.
