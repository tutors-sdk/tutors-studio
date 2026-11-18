# 0048. Learning outcomes in the course folder

**Status:** Accepted
**Date:** 2026-11-18

## Context

The design doc's course design (D1) makes Studio a design tool and not only an assembly tool: a lecturer writes what students should be able to do, tags lectures, labs and quizzes with what they serve, and sees where each outcome is taught, practised and assessed. Neither Studio nor tutors-mono-repo has outcomes today. Step A is Studio only. Step B, upstream (the model, the generator copying them into tutors.json, three course-rules rules, "What you will learn" in the reader), comes after lecturers have used step A.

## Decision

- **Kept in the course folder, so they travel with it.** `outcomes.yaml` at the root lists each outcome's id, Bloom level and sentence, written by Studio in one fixed shape (the sentence always JSON-quoted). Each tagged item's descriptor page (the page whose first line is its card's title) carries one front matter line, `outcomes: [LO1, LO3]`.
- **A pure `outcomes` module in `src/domain`**: reading and writing both forms, the next id (one past the highest, so an id is never reused), what is wrong with a sentence, and the coverage map with its flags. **No new port.** The use cases sit beside course details in authoring, and every change is a plan through `applyPlan` (ADR 0004).
- **What counts as what:** a lab practises, a quiz assesses, any other item teaches. The flags are Not yet practised, Assessed before it is taught, No item serves it yet, and Nothing tagged for a week. None blocks a save or a publish.
- **Absent without outcomes.** A course with no outcomes shows no map and no flags (STU-0192).
- **Tutors is unaffected**, proved by a scenario that runs course-rules over a course before and after outcomes and finds the same findings and titles (STU-0193). The quiz designer keeps a quiz's line when it saves over the page.
- The headless adapter gains `outcomes` and `tag`, so the scenarios drive the same use cases a script can.
- **Two proposals, through the assistant port as it is** (ADR 0036): a new draft kind, `outcomes` (JSON from a module description), and a new suggest task, `serves` (which outcome ids each of a week's items serves). Both come back as plans: drafted outcomes are added after the course's own, and only ids the course has are tagged (STU-0194, STU-0195). The prompts are in `assistant-prompts.ts`, the same for Claude and Ollama.

## Consequences

- Step B is three upstream pull requests: the model, the generator, and course-rules (unknown id, repeated id, an outcome no item serves).
- Programme-level outcomes, accreditation mapping and grading stay out of scope.
