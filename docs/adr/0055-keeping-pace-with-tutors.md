# 0055. Keeping pace with Tutors

**Status:** Accepted
**Date:** 2026-11-19
**Builds on:** ADRs 0043, 0044, 0045, 0046

## Context

Studio carries one Tutors release inside it, named by `tutors-bundle.json` (ADR 0043). The design doc's "Keeping pace with Tutors" asks for two things:

- a bot that bumps the manifest when tutors-mono-repo releases;
- Studio saying when production is ahead of the reader inside it, because the preview drifts from tutors.dev whenever Studio lags a Tutors release.

## Decision

- **The manifest bot** is the `Manifest bot` workflow. It runs daily at 06:13 UTC, on a `tutors-release` repository dispatch, or by hand.
  - It reads the newest tutors-mono-repo release, the commit of its tag, and the versions of `@tutors/tutors` and `@tutors/tutors-lite` in their `deno.json` on that tag.
  - `pnpm bundle bump <tag> <commit> <generator> <tutors-lite>` moves the manifest and writes its pins (STU-0220). It does nothing when the release is not newer.
  - The bot then opens a pull request from `bot/tutors-<version>`, and opens nothing when that branch already exists.
  - A pull request opened with the workflow's own token does not start other workflows. CI runs on the bot's pull requests only when the `BUNDLE_BOT_TOKEN` secret holds a token that may push and open pull requests here: a fine-grained token, or a GitHub App's.
  - A maintainer merges, and the next Studio release carries it.
- **"Production is ahead"** compares two releases (STU-0221):
  - Production's release comes from tutors.dev's reader, which answers its build identity at `/version` (`{ "app": "tutors-reader", "version": … }`, `@tutors/runtime`).
  - Studio's release is `TUTORS_RELEASE`.
  - `UpdatesPort` gains an optional `productionTutors()`. The Tauri adapter asks `https://tutors.dev/version` through `@tauri-apps/plugin-http`, so the request is made by the Rust side, which the app's HTTP scope already allows for `tutors.dev`. It asks at most once a day and keeps the answer on the computer.
  - Publish says so beside "See it in Tutors on this computer" when production is newer. It says nothing when production can't be asked.

## Consequences

- Whether tutors.dev serves `/version` publicly is still to confirm, as the design doc says. Until it does, `productionTutors()` answers null and Studio stays quiet, which is the safe failure.
- The bot reads package versions from `packages/jsr/tutors*/deno.json` on the tag. If tutors-mono-repo moves them, the bot's step fails visibly rather than writing a wrong pin, because `parseBundle` refuses a malformed version.
- How soon after a Tutors release Studio must carry it stays open until the bot has run for two releases, as the design doc says.
