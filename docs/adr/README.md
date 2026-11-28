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
| [0032](0032-undo-history-and-the-bin.md)                                        | Undo, history, and the bin                                                         | Accepted                       |
| [0033](0033-in-app-updates.md)                                                  | In-app updates                                                                     | Accepted, amended by 0046      |
| [0034](0034-tutors-cli-is-the-gate.md)                                          | The Tutors command line is the last check before a course is saved or put online   | Accepted                       |
| [0035](0035-my-files-read-only.md)                                              | My files: the lecturer's own folder, read only, beside the course                  | Accepted                       |
| [0036](0036-assistant-answers-in-text.md)                                       | The assistant answers in text; Studio makes the plan                               | Accepted                       |
| [0037](0037-opt-in-usage-counts.md)                                             | Opt-in usage counts, kept on the computer                                          | Accepted                       |
| [0038](0038-drops-on-a-week-go-straight-in.md)                                  | Files dropped on a week go straight in                                             | Accepted                       |
| [0039](0039-starter-templates-from-the-reference-course.md)                     | Starter templates from the reference course                                        | Accepted, amended by 0041      |
| [0040](0040-files-belong-to-what-shows-them.md)                                 | Files belong to what shows them                                                    | Accepted                       |
| [0041](0041-reference-courses-and-one-template.md)                              | Reference courses and one template                                                 | Accepted                       |
| [0042](0042-a-live-course-in-the-lecturers-own-tutors.md)                       | A live course in the lecturer's own Tutors                                         | Accepted                       |
| [0043](0043-one-manifest-names-the-tutors-inside.md)                            | One manifest names the Tutors inside Studio                                        | Accepted                       |
| [0044](0044-the-tutors-tools-beside-studio.md)                                  | The Tutors tools beside Studio                                                     | Accepted                       |
| [0045](0045-the-tutors-reader-inside-studio.md)                                 | The Tutors reader inside Studio                                                    | Accepted                       |
| [0046](0046-updates-on-opening-and-two-channels.md)                             | Updates on opening, and two channels                                               | Accepted                       |
| [0047](0047-desktop-journeys-on-windows.md)                                     | Desktop journeys on Windows                                                        | Accepted                       |
| [0048](0048-learning-outcomes-in-the-course-folder.md)                          | Learning outcomes in the course folder                                             | Accepted                       |
| [0049](0049-running-the-term.md)                                                | Running the term                                                                   | Accepted                       |
| [0050](0050-engagement-port-with-none.md)                                       | An engagement port, bound to none                                                  | Accepted                       |
| [0051](0051-mcp-tools-and-the-assistant-switch.md)                              | The MCP tools, and the switch that lets an agent in                                | Accepted                       |
| [0052](0052-agent-plans-wait-for-the-lecturer.md)                               | An assistant's plan waits for the lecturer while Studio is open                    | Accepted                       |
| [0053](0053-the-command-line-on-this-computer.md)                               | The command line on this computer                                                  | Accepted                       |
| [0054](0054-the-front-door.md)                                                  | The front door                                                                     | Accepted                       |
| [0055](0055-keeping-pace-with-tutors.md)                                        | Keeping pace with Tutors                                                           | Accepted                       |
| [0056](0056-course-exports.md)                                                  | Loading a course exported from a learning platform                                 | Accepted                       |
| [0061](0061-the-library.md)                                                     | The library: folders Studio searches for courses, read only                        | Accepted                       |
| [0062](0062-composing-a-course-from-the-library.md)                             | Composing a course from the library: always a copy                                 | Accepted                       |
| [0063](0063-folder-registries.md)                                               | Folder registries: sharing under a licence, stored by digest                       | Accepted                       |
| [0064](0064-registries-on-google-drive.md)                                      | Registries on Google Drive                                                         | Accepted                       |
| [0065](0065-searching-the-library-without-holding-up-studio.md)                 | Searching the library without holding up Studio                                    | Accepted                       |
| [0066](0066-the-tutors-inside-studio-for-everyone.md)                           | The Tutors inside Studio for everyone, a developer's own copy in Advanced mode     | Accepted                       |
| [0067](0067-the-dev-command-checks-the-reader-and-tutors-in-settings.md)        | The dev command checks the reader; Tutors in Settings for developers               | Accepted                       |
| [0068](0068-the-library-in-tutors.md)                                           | The library in Tutors                                                              | Accepted                       |

Expected soon after, listed so they are not forgotten: 0013, the anonymised lecturer-folder corpus for proposeShape (how folders are collected, scrubbed and licensed); 0014, publishing @tutors/assistant-port to JSR once the contract has survived a release.
