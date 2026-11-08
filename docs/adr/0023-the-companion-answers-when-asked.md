# 0023. The companion also answers when asked

**Status:** Accepted (extends 0015)
**Date:** 2026-11-08

## Context

ADR 0015 made the companion moment-driven so it could never interrupt the way Office's helper did. Leigh asked for an interactive assistant in that spirit. Interaction the lecturer starts cannot interrupt them.

## Decision

- Moments stay exactly as 0015 says: a fixed table in `src/application/companion/moments.ts`, at most one bubble, no modals, one click to hide, silent while the lecturer types or drags, static under reduced motion. A model adds nothing to the table.
- The lecturer can open the companion and ask a question. `AssistantPort` gains `answer(question, context)`, which writes nothing. The context is the screen's title and the checker's sentences; a page's content is never sent.
- With no assistant, or when one can't answer, the companion answers from a short guide about using Studio (`guide.ts`). The guide says nothing about any rule, so the rules still own those sentences.
- The companion holds no way to write. Its actions only go to a screen (Check, Publish, Settings), where the existing plan-and-accept flow applies (ADR 0004).
- The character is an original folded paper note drawn from Paper's ink and surface tokens. It uses no teal, because teal is the screen's single next action.

## Consequences

`suggest` and `draft` are still unbound, so the assistant explains and answers but doesn't yet propose plans. ADR 0006 applies unchanged: `chosenAssistant` refuses a course the lecturer hasn't allowed.

## Specified by

STU-0045..STU-0052 (`spec/features/companion.feature`).
