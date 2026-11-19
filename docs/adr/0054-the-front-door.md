# 0054. The front door

**Status:** Accepted
**Date:** 2026-11-19
**Builds on:** ADRs 0011, 0044

## Context

The design doc's P3 asks for "one page with a 90-second film of Web Development II being built, the downloads, and 'nothing else to install'", with the walkthrough guide (`docs/guides/web-development-2-walkthrough.md`) as the film's script. Studio had no page of its own: the downloads were a table in README.md and docs/install.md. A film recorded by hand goes stale the first time a screen changes.

## Decision

- **The page is `site/`**: plain HTML, one stylesheet and a few lines of script, using Studio's own `paper-tokens.css`, Inter and icon, copied in when it is built. The download for the visitor's own computer becomes the page's single teal action (DESIGN.md). Every download link is the same `releases/latest/download/…` address as docs/install.md, and a test keeps the two the same.
- **The film is recorded, not edited.** `scripts/film.ts` starts Studio's browser preview (the in-memory course of `pnpm dev`), drives it with Playwright through the walkthrough's first steps (new course, the Web Development II reference course, slides dropped on week 1, the week's page written, Changes, Check and publish), with a caption for each step, and records it at 1280×800. ffmpeg makes an MP4 and a poster from the WebM. A transcript under the film says the same in text.
- **Playwright is a pinned dev dependency (1.63.0)**, used only by the film. Studio's own tests keep jsdom and WebdriverIO.
- **`pnpm front-door`** builds the page and the film into `_site/` (not committed); `--no-film` skips the film. The **Front door** workflow builds it on each push to main that touches the screens, the site or the film, and publishes it to GitHub Pages at https://tutors-sdk.github.io/tutors-studio/.

## Consequences

- The film always shows the screens as they are on main. A change that breaks the walkthrough fails the Front door workflow, which names the step.
- Pages must be turned on for the repository, with GitHub Actions as its source (Settings → Pages), once.
- The film shows the browser preview, not the desktop window's frame; the screens are the same.
