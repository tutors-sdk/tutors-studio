# The EARS register

Every behaviour of Studio is stated here first, as one EARS sentence with a permanent `STU-` id, before any code (ADR 0008). The same sentence is a `Rule:` in `spec/features/`, tagged `@stu-NNNN` and one `@ears-*` pattern tag, with Gherkin scenarios beneath it. `spec/steps/` binds each Rule and drives the headless adapter (`src/adapters/cli/headless`) over an in-memory course, never the UI, so the scenarios are fast and run on every OS.

`pnpm ears:audit` fails the build when:

- a register entry has no Rule, or a Rule has no register entry, or their wording differs;
- a Rule has no steps file binding it by its exact title;
- a sentence has other than one "shall", or its pattern tag does not match its first word (When, While, If, Where, or none).

Ids are never reused. A retired id stays in the register, struck through, with the reason; its Rule and steps are removed, and the audit refuses a Rule that still uses it.

| Pattern            | Tag                | Form                          |
| ------------------ | ------------------ | ----------------------------- |
| Ubiquitous         | `@ears-ubiquitous` | The Studio shall …            |
| Event-driven       | `@ears-event`      | When …, the Studio shall …    |
| State-driven       | `@ears-state`      | While …, the Studio shall …   |
| Unwanted behaviour | `@ears-unwanted`   | If …, then the Studio shall … |
| Optional feature   | `@ears-optional`   | Where …, the Studio shall …   |
