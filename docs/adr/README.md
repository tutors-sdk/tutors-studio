# Architecture decision records

One file per decision: context, decision, consequences, and the EARS ids the decision gives rise to. An ADR is required for a new port, a new adapter for an existing port, a change to any MCP tool schema, a change to DESIGN.md tokens, and any dependency outside the pinned set.

| ADR                                                                             | Decision                                                                           | Status                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| [0001](0001-tauri-2-as-the-desktop-shell.md)                                    | Tauri 2 as the desktop shell                                                       | Proposed                       |
| [0002](0002-hexagonal-rings.md)                                                 | Hexagonal rings enforced by dependency-cruiser                                     | Accepted                       |
| [0003](0003-course-rules-from-jsr-pinned.md)                                    | course-rules and tutors-create consumed from JSR, pinned                           | Accepted                       |
| [0004](0004-plan-then-apply.md)                                                 | Plan-then-apply for every write                                                    | Accepted                       |
| [0005](0005-assistant-port-model-agnostic.md)                                   | AssistantPort is model-agnostic and optional                                       | Accepted                       |
| [0006](0006-remote-assistants-per-course-opt-in.md)                             | Remote assistants require per-course opt-in                                        | Accepted                       |
| [0007](0007-mcp-server-not-client.md)                                           | Studio is an MCP server, not (yet) a client                                        | Accepted; client role deferred |
| [0008](0008-ears-specification-layer.md)                                        | EARS is the specification layer                                                    | Accepted                       |
| [0009](0009-port-contract-suites.md)                                            | Port contract suites run against every adapter                                     | Accepted                       |
| [0010](0010-three-os-ci.md)                                                     | Three-OS CI matrix on every PR, plus WebKitGTK                                     | Accepted                       |
| [0011](0011-design-contract-and-impeccable.md)                                  | DESIGN.md (Tutors Paper) is the design contract; Impeccable is the method          | Accepted                       |
| [0012](0012-shape-from-pattern-and-calendar.md)                                 | Shape is derived from a pattern and the calendar, never configured                 | Accepted                       |
| [0015](0015-companion-moment-driven.md)                                         | The companion is moment-driven, not model-driven                                   | Accepted                       |
| [0016](0016-api-keys-in-keychain.md)                                            | API keys live in the OS keychain, never in SettingsPort                            | Accepted                       |
| [0017](0017-installing-without-a-fight.md)                                      | Installing Studio without a fight                                                  | Accepted                       |
| [0018](0018-previews-through-marp-and-mermaid.md)                               | Slides and diagrams are checked and previewed through two new ports                | Superseded by 0031             |
| [0019](0019-publishing-through-the-generator-a-container-reader-and-netlify.md) | Preview and publish through the generator, a container reader and Netlify          | Partly superseded by 0031      |
| [0020](0020-settings-appearance-and-the-tutors-env.md)                          | Settings: appearance for dyslexia and low vision, and the Tutors .env              | Partly superseded by 0031      |
| [0021](0021-handing-off-through-the-computers-git.md)                           | Step 9: fix all safe, and hand off through the computer's git                      | Accepted                       |
| [0022](0022-claude-through-anthropics-sdk.md)                                   | Claude is the first assistant, through Anthropic's SDK from the WebView            | Accepted                       |
| [0023](0023-the-companion-answers-when-asked.md)                                | The companion also answers when asked                                              | Accepted                       |
| [0024](0024-course-book-and-advanced-mode.md)                                   | The course book, and Advanced mode                                                 | Accepted                       |
| [0025](0025-markdown-editor.md)                                                 | The markdown editor: CodeMirror, markdown-it, and saving through a plan            | Accepted                       |
| [0026](0026-plain-writing-with-tiptap.md)                                       | Writing in plain language: TipTap, kept as markdown, saved through a plan          | Accepted                       |
| [0027](0027-setup-added-when-sending.md)                                        | Standard setup is added when a course is sent                                      | Accepted                       |
| [0028](0028-ollama-for-a-model-on-this-computer.md)                             | A model on this computer: Ollama over its HTTP API, through Tauri's HTTP client    | Accepted                       |
| [0029](0029-save-the-course-as-a-website.md)                                    | Saving the course as a website: tutors-lite, copied to a folder the lecturer picks | Accepted                       |
| [0030](0030-publish-saves-a-compliant-course.md)                                | Publish saves a compliant course; Netlify is optional and later                    | Accepted                       |
| [0031](0031-retire-the-local-preview-and-drawings.md)                           | Retire the local preview, reader variables, and slide and diagram drawings         | Accepted                       |

Expected soon after, listed so they are not forgotten: 0013, the anonymised lecturer-folder corpus for proposeShape (how folders are collected, scrubbed and licensed); 0014, publishing @tutors/assistant-port to JSR once the contract has survived a release.
