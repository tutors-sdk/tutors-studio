# 0005. AssistantPort is model-agnostic and optional

**Status:** Accepted
**Date:** 2026-11-08

## Context

A model can help a lecturer most by naming topics from slides, drafting lab steps and explaining findings in their course's words. Lecturers differ in what they can install, pay for and are allowed to send off campus.

## Decision

One small contract (capabilities, explain, suggest, draft, review) with five adapters: ollama (local), anthropic, openai, google and none, sharing one prompt library, token-budget guard, retry policy and cassette recorder. `none` is a real adapter that returns nothing, so no code path has an `if (assistant)` branch. No method writes; draft returns a Plan. This bootstrap ships `none`; the others follow behind feature flags.

## Consequences

Every journey must pass with `none` bound. The provider and model are settings, not dependencies; adding a sixth provider is a day's work and a contract-suite run.

## Specified by

STU-0005
