# 0022. Claude is the first assistant, through Anthropic's SDK from the WebView

**Status:** Accepted
**Date:** 2026-11-08

## Context

ADR 0005 planned five assistant adapters; only `none` existed. Leigh asked for Claude first. ADR 0006 says a remote assistant reads a course only after the lecturer allows it, and ADR 0016 says its key lives in the keychain. Neither had rules yet.

## Decision

- **`assistant/anthropic` uses `@anthropic-ai/sdk`, pinned exactly (1.6.0).** It calls the Messages API straight from the WebView with `dangerouslyAllowBrowser`. That flag guards against shipping a key to strangers' browsers. Here the key is the lecturer's own, read from their keychain on their own computer. The Tauri CSP now allows `connect-src` to `api.anthropic.com` (and `api.netlify.com`, which publishing already needed).
- **What it sends.** For `explain`, it sends a fixed system prompt (cached), and the finding's path, severity and message. It sends no page, slide or file content.
- **How it asks.** The default model is Claude Opus 5.5, at `effort: "low"` because these are short explanations. Settings also offers Sonnet 5.5 and Haiku 5.5. Requests carry server-side `fallbacks: "default"`, so a safety-classifier decline is retried on Anthropic's recommended model rather than failing.
- **Errors become one sentence for the lecturer** (`AssistantUnavailable`): a refused key, a model the key can't use, a rate limit, no connection, or a decline. `AuthoringPort.explain` then returns the rule's own message with that sentence beside it (STU-0043).
- **`chosenAssistant` in the application layer binds what Settings says, at every call.** With none chosen it answers nothing, as `none` does. With Claude chosen but no key, or for a course not allowed, it sends nothing and says why (STU-0042). Read permission is per course folder, in `Settings.remoteOptIn`, and the Check and publish screen asks for it every time (ADR 0006).
- **The key goes to the keychain** under `anthropic-api-key`. Settings stores only the provider and model (STU-0044, ADR 0016).
- **`suggest`, `draft` and `review` return nothing for now.** They arrive with the companion (ADR 0015), which Leigh is building.

## Consequences

Each explanation costs a little on the lecturer's Anthropic account; Settings says so. The headless CLI still binds `none`. Ollama, OpenAI and Google follow the same `AssistantProviders` shape when they come.

## Specified by

STU-0041..STU-0044 (`spec/features/assistant.feature`).
