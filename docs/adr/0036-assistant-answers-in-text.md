# 0036. The assistant answers in text; Studio makes the plan

**Status:** Accepted
**Date:** 2026-11-10

## Context

Feature 13 of the next-phase document asks for an assistant that proposes: "Draft this lab from my notes" and "suggest titles and an order", each returned as a plan to accept, reading markdown only. `AssistantPort` already named the tasks (`draft("lab-steps", …)` and `suggest("order", …)`), but `draft` returned a `Plan`. A model doesn't know the course's folders, step numbering or the rewire planners, and each adapter (Claude, Ollama, and any later one) would have had to build file operations itself.

## Decision

- `draft(kind, brief)` returns markdown, or "" when the assistant drafts none. For "lab-steps", each step starts with a level-one heading.
- `suggest("order", { week, items })` is given the week's items as JSON (name, kind, title and the first 400 characters of the page Tutors takes the title from). It returns one suggestion per item, in the suggested order. Each suggestion's value is the suggested title, its new optional `for` is the item's name, and its evidence is the reason.
- The prompts (`DRAFT_LAB_SYSTEM`, `ORDER_SYSTEM`) and the reading of the answer (`orderSuggestions`, `draftedSteps`, `suggestedOrder`) live in the application and domain, so every adapter sends the same words and is read the same way.
- The application turns each answer into a plan:
  - `planLabDraft` writes the drafted steps after the lab's own steps (STU-0136).
  - `planWeekSuggestion` retitles items through the rules' retitle planner, then puts each kind in the suggested order through the reorder planner, in one plan (STU-0137).
  - An answer Studio can't read, or having no assistant, gives a sentence and no plan (STU-0138).
- What leaves the computer is what the lecturer typed for a draft, or titles and page starts for an order. Nothing is sent from a course the lecturer hasn't allowed (ADR 0006).

## Consequences

- An adapter only asks and returns text, so adding a provider adds no plan-building code.
- A model that answers badly costs a sentence, not a broken course: names Studio didn't send are dropped, and the rules planners refuse what Tutors can't read.
- Other suggest tasks (title, icon, summary) and the other draft kinds still answer nothing until a feature asks for them.
