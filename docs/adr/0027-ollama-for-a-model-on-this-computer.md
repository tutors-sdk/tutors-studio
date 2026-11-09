# 0027. A model on this computer: Ollama over its HTTP API, through Tauri's HTTP client

**Status:** Accepted
**Date:** 2026-11-09

## Context

ADR 0005 promised five assistants; only Claude (ADR 0022) and none were built. Leigh asked for Ollama next ("Build ollama"). It is the one that never sends a course anywhere and costs nothing per answer, which matters to lecturers whose institutions won't let course material leave the campus.

## Decision

- **Adapter:** `src/adapters/assistant/ollama` speaks Ollama's own HTTP API (`/api/chat`, `/api/tags`, `/api/pull`) with `fetch`. No SDK: the API is three small JSON calls, and an SDK would add a dependency for no gain. It only ever addresses `http://127.0.0.1:11434`.
- **Getting past CORS:** the window's own `fetch` would be refused on Windows, whose WebView origin (`http://tauri.localhost`) is not on Ollama's default list of allowed origins. In the app, the adapter is given the fetch from Tauri's HTTP plugin, which sends from the Rust side. `@tauri-apps/plugin-http` and the `tauri-plugin-http` crate are pinned exactly at 2.8.3. The capability lets that client reach only Ollama's port on this computer, so the plugin can't become a general way out. The browser preview (`pnpm dev`) uses the window's fetch, which Ollama allows from localhost.
- **Prompts:** the same system prompts and finding text as Claude, moved into `src/application/assistant-prompts.ts` so every adapter is asked the same thing (Part 1e).
- **No opt-in:** the adapter reports `local: true`, so ADR 0006's per-course permission doesn't apply; nothing leaves the computer.
- **Models:** a new driven port, `LocalModelsPort`, lists what Ollama has and downloads a model. Settings offers the models smallest first and uses the smallest until the lecturer picks another. A fresh Ollama is offered one small model, Llama 3.2 3B (about 2 GB). If Ollama is closed, the lecturer's choice is kept and each explanation says how to open it.

## Consequences

The lecturer has to install Ollama themselves; Studio says where to get it when it can't find it. A small model explains less well than Claude, which Settings says. Downloading blocks the button until Ollama finishes, with no progress bar yet.

## Specified by

STU-0074 to STU-0077 (`spec/features/assistant.feature`).
