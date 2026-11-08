# 0019. Publishing through the Tutors generator, a container reader and Netlify's API

**Status:** Accepted
**Date:** 2026-11-08

## Context

A lecturer wants to see the course as students will, on their own computer, and then share it. Today that means running `tutors` with Deno, a static server, a reader, and a Netlify deploy by hand. Studio's own previews (ADR 0018) show one page; they are not the reader.

## Decision

Six new application ports, each with the adapters named:

- `ProcessPort` (`run(tool, args)`), the only way Studio starts a program. `src/adapters/process/node` spawns for the headless CLI; `src/adapters/process/tauri` calls the Rust `run_tool` command, which allows only `deno --version`, the pinned generator run, and `docker`/`podman` `--version`, `rm`, `logs` and `run`, with every `-v` mount inside the open course folder (`src-tauri/src/tool.rs`). The WebView can't run anything else.
- `CourseBuildPort` (`build`), adapter `src/adapters/build/tutors-gen`: the Tutors generator itself, `jsr:@tutors/tutors@5.3.0`, with Deno when it is installed, else in `docker.io/denoland/deno:2.9.6` under Docker or Podman. It writes `json/` in the course folder, as `tutors` and Netlify always have. This is the one write to a course that is not a plan (ADR 0004): `json/` is generated output, which course-rules and the course map already ignore.
- `LocalReaderPort` (`start`, `stop`), adapter `src/adapters/reader/container`: Caddy (the digest the Tutors stack's compose file pins) serving `json/` read-only on 127.0.0.1:8190 with the CORS header Netlify sets, and `quay.io/tutors-sdk/tutors-reader:17.0.0` on 127.0.0.1:3000 in anonymous mode. The link is `http://localhost:3000/course/localhost:8190`, the same path the reader uses for a Netlify site.
- `HostingPort` (`signedIn`, `signIn`, `deploy`), adapter `src/adapters/hosting/netlify`: Netlify's file-digest deploy API (create the site if new, send SHA-1s, upload only what Netlify asks for, wait for ready), adding `_headers` (CORS) and `_redirects` the way the course's `netlify.toml` does. No Netlify CLI, so nothing else to install.
- `SecretsPort` (`get`, `set`): the Netlify token. `src/adapters/secrets/tauri` uses the OS keychain through the `keyring` crate (service `dev.tutors.studio`), as ADR 0016 requires; `env` reads `NETLIFY_AUTH_TOKEN` for the CLI; `memory` is for the browser preview and tests.
- `PublishingPort`, the driving port the UI and `pnpm headless <folder> preview-here|publish <site>` use. Publishing refuses a course with errors, so students never get half a course.

Links the panel gives open in the browser through `tauri-plugin-opener`, whose capability allows only the local reader, tutors.dev and `*.netlify.app`.

Images and the generator are pinned; moving a pin is a one-line change with a release note.

## Consequences

Linux builds need `libdbus-1-dev` for the keychain. The first preview downloads the reader image, so it needs the internet once. A lecturer needs Docker or Podman for the local reader; Deno alone is enough to publish.

## Specified by

STU-0021..STU-0025 (`spec/features/publishing.feature`).
