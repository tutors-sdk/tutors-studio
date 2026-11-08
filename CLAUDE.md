# Tutors Studio

A Tauri 2 + Svelte 5 desktop app that shows a lecturer their Tutors course folder the way Tutors reads it, explains what is wrong in a lecturer's words, and fixes it through accepted plans. The spec is the "Tutors Create — Validate, Guide" document (Parts 1b–1h); decisions are in `docs/adr/`.

## Rules that are not optional

- **Spec first.** A behaviour change starts as an EARS sentence with a new `STU-` id in `spec/ears/` (`pnpm ears:audit --next-id`), the same sentence as a tagged `Rule:` in `spec/features/`, and steps in `spec/steps/` that drive the headless adapter. `pnpm ears:audit` must pass. Ids are never reused.
- **Rings.** `src/domain` imports nothing; `src/application` imports only the domain; an adapter in `src/adapters/<port>/<impl>` imports the application, the domain and one SDK; `src/ui` never imports an adapter; only `src/main.ts` and `src/headless.ts` name adapters. `pnpm architecture` enforces it.
- **Plan, then apply.** Nothing writes to a course except `applyPlan` with a plan the lecturer accepted (ADR 0004).
- **No copy about rules.** Messages about a course come from `@tutors/course-rules`; never write a second sentence for the same finding.
- **Tokens only.** Colours, spacing and sizes come from `src/ui/paper-tokens.css` and DESIGN.md. Teal is for the single next action on a screen.
- **Never edit `vendor/course-rules`.** It is an unchanged copy until the package is on JSR; changes go upstream to tutors-sdk/tutors-mono-repo.
- A new port, adapter, MCP schema change, token change or unpinned dependency needs an ADR.

## Commands

| Command                               | What                                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `pnpm install`                        | dependencies                                          |
| `pnpm dev`                            | the UI in a browser, over a sample course in memory   |
| `pnpm tauri dev`                      | the desktop app                                       |
| `pnpm test`                           | domain, application, contract and EARS scenario tests |
| `pnpm test:rust`                      | the Rust side's tests (path guard, move semantics)    |
| `pnpm check`                          | svelte-check / TypeScript                             |
| `pnpm architecture`                   | dependency-cruiser ring rules                         |
| `pnpm ears:audit`                     | register, features and steps agree                    |
| `pnpm headless <folder> [check\|fix]` | Studio without a window                               |

On Linux the desktop build needs `libwebkit2gtk-4.1-dev`, `librsvg2-dev` and `libssl-dev`.

## Design method

Impeccable (pbakaus/impeccable) is the UI method, against DESIGN.md as the contract (ADR 0011). Install its skills with `npx -y skills add pbakaus/impeccable --skill impeccable --agent claude-code` and commit `.claude/skills`.

## Merging

Claude merges its own Studio PRs once CI is green on every OS; Leigh reviews after.
