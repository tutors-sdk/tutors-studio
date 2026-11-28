# 0069. Tutors releases as a dependency

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0043](0043-one-manifest-names-the-tutors-inside.md), [0045](0045-the-tutors-reader-inside-studio.md), [0055](0055-keeping-pace-with-tutors.md), [0067](0067-the-dev-command-checks-the-reader-and-tutors-in-settings.md)

## Context

Leigh, 2026-11-28: "I also want to ensure architecturally that we can have a relationship with upstream tutors so on version releases we can target it as a dependency and install it."

Studio has always pinned Tutors in `tutors-bundle.json` (ADR 0043), and the manifest bot moves the pin to each newer release (ADR 0055). But until now the reader inside Studio was built from a tutors-mono-repo checkout at the pinned commit, because no release carried it. tutors-sdk/tutors-mono-repo#622 makes every release carry:

- its static reader (`tutors-reader-static-X.Y.Z.tar.gz`);
- the `tutors` program for each target;
- `tutors-release.json`, a manifest of the release: `{schema: 1, tutors, tag, commit, repository, prerelease, generator, website, deno, parts: [{name, asset, target?, url, sha256}]}`.

A final release also sends a `tutors-release` repository dispatch to tutors-studio with the URL of its manifest.

## Decision

- **`tutors-release.json` is the contract.** `parseReleaseManifest` reads schema 1 and refuses anything else by name. `bundleFromRelease` moves `tutors-bundle.json` to a newer final release (STU-0321): its version, generator, tutors-lite, Deno and commit, and its `reader` part as the manifest's reader part. That part keeps the release's URL and SHA-256, and goes to `.cache/parts/<asset>`. Prereleases are left for testers.
- **The manifest bot reads it.** On the dispatch, it reads the URL sent, which must be a `tutors-release.json` under tutors-mono-repo's own release downloads. On its daily run, it reads the newest release's manifest. It runs `pnpm bundle bump --release <manifest>` and opens the pull request as before. A release with no `tutors-release.json` still moves the manifest from its tag (ADR 0055).
- **`pnpm bundle reader` installs the release's reader** when the manifest has a reader part (STU-0322). It downloads the file, checks its SHA-256 (STU-0323, as STU-0172 does for every part), unpacks it, and stamps it with the release's commit, building nothing. It does the same in the release workflow and for `pnpm tauri dev`'s check (ADR 0067). With no reader part, it builds from the pinned commit as before.
- **The Tutors tools stay Studio's own**, compiled from the pinned commit (ADR 0044). The release's `tutors` program has no `validate` that Studio uses yet, and Studio's tools also carry its command line. The release's per-target parts are read but not carried.

## Consequences

- Once #622 is merged and a release runs, a Tutors release becomes a dependency of Studio: the bot opens a pull request moving to it, CI runs the bundle journeys against it, and the next Studio release installs that exact reader, checked by its SHA-256.
- The dispatch needs the `STUDIO_DISPATCH_TOKEN` secret upstream. Without it, the daily run still finds each release within a day.
- If upstream changes the manifest's shape, it raises the schema number, and Studio refuses it until it reads the new one.
