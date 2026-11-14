# 0031. Retire the local preview, reader variables, and slide and diagram drawings

**Status:** Accepted; the local reader comes back, run from the lecturer's own copy of Tutors, in [0042](0042-a-live-course-in-the-lecturers-own-tutors.md)
**Date:** 2026-11-09
**Supersedes:** ADR 0018; the local reader in ADR 0019; the Tutors .env in ADR 0020

## Context

Leigh's decisions on the "Tutors Studio: evaluation and recommended features" document (9 Nov):

- "The local preview is retired."
- "Studio shows text and markdown only; nothing is drawn. The Mermaid check goes."
- Keys stay in the keychain; the assistant and Netlify are set up in Settings.

The preview was the only reason Studio ran a Tutors reader and a course server in containers, and the only consumer of the reader's `.env` variables in Settings. The Marp and Mermaid drawings were the only reason Studio bundled marp-core and Mermaid.

## Decision

- Remove `LocalReaderPort` and its container adapter, the Preview button, and the headless `preview-here` command. STU-0021 and STU-0022 are retired.
- Remove the reader variables from Settings, `src/domain/environment.ts`, and the reader entries in `.env.example`. STU-0034 and STU-0035 are retired. The assistant key and the Netlify token stay in the keychain.
- Remove `DiagramPort`, `SlidesPort`, the Mermaid and Marp adapters, `Previews.svelte`, the headless `preview` command, and the `mermaid` and `@marp-team/marp-core` dependencies. STU-0012, STU-0013 and STU-0014 are retired. Slides and diagrams are text in their pages, and course-rules still checks the course.
- The Rust side now runs only one image: Deno, used to build the course when the computer has no Deno. It refuses `rm`, `logs`, `-e`, and any mount other than the course at `/course`. The opener drops `http://localhost:3000/*`.

## Consequences

- Studio needs Docker or Podman only to build without Deno, for Netlify or for Save as a website. Saving the course needs no tools at all (ADR 0030).
- A lecturer sees the course as students will once it is on Netlify, or by opening the saved website.
- There is less to sign and less to audit: two ports, two adapters, two images and two large dependencies are gone.
