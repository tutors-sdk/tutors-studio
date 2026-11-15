# 0042. A live course in the lecturer's own Tutors

**Status:** Accepted
**Date:** 2026-11-14
**Supersedes:** the retirement of the local reader in [0031](0031-retire-the-local-preview-and-drawings.md)
**Builds on:** [0019](0019-publishing-through-the-generator-a-container-reader-and-netlify.md)

## Context

ADR 0019 ran the Tutors reader in a container, from a pinned image, and ADR 0031 retired it. Leigh (2026-11-14) brought it back in another form: "a local version of Tutors running so that we can live deploy to it. This assumes that tutors dev is downloaded and available locally ... ensure we have a smooth publish-deploy strategy so someone can see the course evolving."

Reading the mono-repo (tutors-sdk/tutors-mono-repo at b278ff93) showed what that needs:

- `pnpm dev` at the repository root builds the UI packages and starts the reader with Vite, on http://localhost:5173 (or the next free port, which it prints).
- With `PUBLIC_ANON_MODE=TRUE` the reader needs no sign-in, Supabase or other backend. SvelteKit reads it from the environment as well as from `.env`.
- The reader opens any course by its address: `/course/127.0.0.1:8190` fetches `http://127.0.0.1:8190/tutors.json`. `determineCourseUrl` treats localhost and IPv4 addresses as plain http, so a course served on this computer needs no Netlify and no certificate.
- The reader runs in the browser only (`ssr = false`). It keeps each course in memory per page load, so reloading the page reads the course again. That works only if the server says not to cache the file.
- `/healthz` answers with `"app":"tutors-reader"`. That tells Studio whether the server on the reader's port is really Tutors.

## Decision

- **The lecturer's own copy of Tutors runs the reader.** Studio pins no reader image and needs no container. The lecturer chooses the folder they cloned tutors-mono-repo into. Studio accepts it only if its package.json is named `tutors-mono-repo`, it holds `apps/reader`, and `node_modules` is installed. Otherwise Studio says what to do and remembers nothing (STU-0164). The folder is kept in settings as `tutorsFolder`.
- **Going live** (STU-0165):
  1. The course is built with the pinned generator, as for Netlify (`CourseBuildPort`).
  2. Its `json/` folder is served on 127.0.0.1, from port 8190 or the next free port up to 8199. The server sends `Access-Control-Allow-Origin: *` and `Cache-Control: no-store`, and only GET and HEAD of files inside `json/`.
  3. If a reader already answers on 5173, Studio uses it. Otherwise Studio runs `pnpm dev` in the lecturer's copy with `PUBLIC_ANON_MODE=TRUE` and reads the address Vite prints.
  4. The link is `<reader>/course/127.0.0.1:<port>`.
- **Seeing it evolve** (STU-0166, STU-0167):
  - In the app, the course opens in a Tutors window of Studio's own. After each change Studio rebuilds, then reloads that window on the page it shows.
  - Changes heard during a rebuild cause one more rebuild, not one each.
  - The course watcher ignores `json/`, `html/` and dot folders, so a build never sets off another.
  - A rebuild that fails leaves the last build in Tutors and says why.
- **Stopping** (STU-0168): Stop, leaving the course or quitting Studio stops the server, and the reader if Studio started it. That reader is stopped with its whole process group (`kill -TERM -pgid`, `taskkill /T` on Windows), because `pnpm dev` runs Vite as its child. A reader the lecturer started is left running.
- **Ports and adapters:**
  - New driven port `LocalTutorsPort`, with adapters `local-tutors/tauri` (Rust `live.rs`) and `local-tutors/node` (the headless CLI).
  - New driving port `LiveTutorsPort` (`createLiveTutors`).
  - New headless command: `pnpm headless <course> live <tutors folder>`.
- **Guards:**
  - The Tutors window is not in any capability, so the reader's pages cannot call Studio's commands.
  - `tutors_show` opens only a reader on this computer reading a course on this computer.
  - `tutors_reader_start` runs `pnpm dev` only in a folder that passes the same check as STU-0164.
  - The opener may open `http://localhost:*/course/*` in the browser.

## Amendment (2026-11-15): saying it is updating

Leigh asked whether a change shows continuously or after a delay, and for the lecturer to be told when there is one. Measured with the pinned generator:

- Web Development II made from its reference course rebuilds in about 0.3 seconds.
- The original module-web-dev-2-2022 rebuilds in about 3 seconds, and about 14 the first time, while the disk cache is cold. Most of the 3 seconds isn't copying its 258 MB of PDFs: it has `llm: 2` in properties.yaml, so every build zips every talk PDF again at the highest compression, once for the course and once per topic.
- The first build on a computer adds about 15 seconds while Deno fetches the generator.

So Studio says what is happening (STU-0169, STU-0170):

- The line at the foot of the contents says **Live in Tutors: updating…** the moment a change is heard, then **up to date at HH:MM, rebuilt in N seconds**, or **the last change didn't build**.
- `LocalTutorsPort.note` puts a note over the course in the Tutors window: **Studio is updating this course…**, or that the change didn't build. The reload clears it.
- The note goes in through `eval` in Studio's own Tutors window. Its text is a JSON string literal, so nothing in it runs.
- Only the last of several queued rebuilds reloads the window.
- Making the rebuild itself faster belongs upstream in the generator: tutors-sdk/tutors-mono-repo#596 writes only the files and PDF zips that changed, which takes that course's rebuild from about 3.1 to 0.55 seconds. Studio picks it up when the pinned generator moves to a release with it.

## Consequences

- Nothing new to install for someone who already develops Tutors. Someone who doesn't needs Node, pnpm and a clone of tutors-mono-repo with `pnpm install` run once. The first `pnpm dev` takes a minute or two while it builds Tutors' UI packages.
- What the lecturer sees is the Tutors they have checked out, which may be ahead of or behind tutors.dev. That is the point for someone working on Tutors itself. Publishing to Netlify still shows the course in the released reader.
- In the headless CLI and a separate browser, the page must be reloaded by hand after each rebuild. Only Studio's own window reloads itself. A reader that watched a course on this computer for changes would remove that step; it belongs upstream in the reader if wanted.
- On macOS, an app started from the Dock may not see `pnpm` on its PATH. If so, Studio says to run `pnpm dev` in a terminal, and then uses the reader already running.

## Specified by

STU-0164..STU-0168 (`spec/features/live-tutors.feature`).
