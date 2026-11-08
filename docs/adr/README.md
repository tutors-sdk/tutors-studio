# Architecture decision records

One file per decision: context, decision, consequences, and the EARS ids the decision gives rise to. An ADR is required for a new port, a new adapter for an existing port, a change to any MCP tool schema, a change to DESIGN.md tokens, and any dependency outside the pinned set.

| ADR                                                 | Decision                                                                  | Status                         |
| --------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| [0001](0001-tauri-2-as-the-desktop-shell.md)        | Tauri 2 as the desktop shell                                              | Proposed                       |
| [0002](0002-hexagonal-rings.md)                     | Hexagonal rings enforced by dependency-cruiser                            | Accepted                       |
| [0003](0003-course-rules-from-jsr-pinned.md)        | course-rules and tutors-create consumed from JSR, pinned                  | Accepted                       |
| [0004](0004-plan-then-apply.md)                     | Plan-then-apply for every write                                           | Accepted                       |
| [0005](0005-assistant-port-model-agnostic.md)       | AssistantPort is model-agnostic and optional                              | Accepted                       |
| [0006](0006-remote-assistants-per-course-opt-in.md) | Remote assistants require per-course opt-in                               | Accepted                       |
| [0007](0007-mcp-server-not-client.md)               | Studio is an MCP server, not (yet) a client                               | Accepted; client role deferred |
| [0008](0008-ears-specification-layer.md)            | EARS is the specification layer                                           | Accepted                       |
| [0009](0009-port-contract-suites.md)                | Port contract suites run against every adapter                            | Accepted                       |
| [0010](0010-three-os-ci.md)                         | Three-OS CI matrix on every PR, plus WebKitGTK                            | Accepted                       |
| [0011](0011-design-contract-and-impeccable.md)      | DESIGN.md (Tutors Paper) is the design contract; Impeccable is the method | Accepted                       |
| [0012](0012-shape-from-pattern-and-calendar.md)     | Shape is derived from a pattern and the calendar, never configured        | Accepted                       |
| [0015](0015-companion-moment-driven.md)             | The companion is moment-driven, not model-driven                          | Accepted                       |
| [0016](0016-api-keys-in-keychain.md)                | API keys live in the OS keychain, never in SettingsPort                   | Accepted                       |

Expected soon after, listed so they are not forgotten: 0013, the anonymised lecturer-folder corpus for proposeShape (how folders are collected, scrubbed and licensed); 0014, publishing @tutors/assistant-port to JSR once the contract has survived a release.
