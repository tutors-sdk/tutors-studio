# 0020. Settings: appearance for dyslexia and low vision, and the Tutors .env

**Status:** Accepted; partly superseded by [0031](0031-retire-the-local-preview-and-drawings.md)
**Date:** 2026-11-08

## Context

Leigh asked for light and dark, a compliant dyslexia mode, help for people with low vision, and a small settings menu for the environment variables in Tutors' `.env`. Studio had a `SettingsPort` with only a memory adapter, and its tokens followed the computer's light or dark setting with no override.

## Decision

- **Appearance is attributes on `<html>`, and tokens only.** `src/domain/appearance.ts` turns the lecturer's choices into `data-theme`, `data-dyslexia`, `data-text-size`, `data-contrast` and `data-motion`. `paper-tokens.css` overrides tokens under those attributes, so no component styles itself per setting. Font tokens become `calc(base × --studio-scale × --studio-type-boost)`.
  - **Light or dark** sets `color-scheme`, which picks one side of every existing `light-dark()` token. "Match this computer" is the default.
  - **Dyslexia mode** follows the British Dyslexia Association's style guide and WCAG 1.4.12. It uses OpenDyslexic, or Verdana if the lecturer prefers a plain font, set 12.5% larger, with a wider sidebar. Letter spacing is 0.12em (0.05em with OpenDyslexic, whose glyphs are already widely spaced), word spacing 0.16em and line height at least 1.5. Text is dark on the reader's own cream Dyslexia palette, with no pure white, and italics become plain text. OpenDyslexic Regular and Bold ship in `public/fonts` under the SIL Open Font License, the same files the reader uses.
  - **Text size** goes from 100% to 200% (WCAG 1.4.4), scaling text, the sidebar and tree rows together. Ctrl or Cmd with +, − and 0 change it, as in a browser.
  - **High contrast** means black and white ink and borders, a darker teal, and a 4px focus ring, aiming at 7:1 (WCAG 1.4.6). "Match this computer" follows `prefers-contrast: more`. It comes after dyslexia mode in the stylesheet, so it wins where both set a colour.
  - **Reduce motion** turns off animation and transitions, as does `prefers-reduced-motion`.
  - The focus ring becomes 3px everywhere, as DESIGN.md already says.
- **A new adapter, `settings/local-storage`.** Settings persist in the WebView's own storage, which is per app in Tauri and per site in the browser preview. It replaces the planned SQLite adapter until settings outgrow a few keys. It never holds a secret.
- **The Tutors .env, in Settings.** `src/domain/environment.ts` lists the variables of `tutors-mono-repo/.env.example`, grouped, with a lecturer's sentence for each, plus Studio's own `NETLIFY_AUTH_TOKEN`. Studio's `.env.example` is generated from that list, and a contract test keeps the two in step.
  - Non-secret values go to settings. Secrets go to the keychain through `SecretsPort` (ADR 0016) and are never shown back.
  - The container reader gets them as `-e NAME=value`. Anonymous mode stays on unless the lecturer turns it off, and placeholders from `.env.example` are never passed on.
  - The headless CLI reads a `.env` in the folder it runs from.
- **`run_tool` is tighter.** `docker run` and `podman run` may now start only the three pinned images. They refuse `--privileged`, `--mount`, `--volume`, `--network`, `--cap-add`, `--device`, `--pid` and `--security-opt`, and accept `-e` only for Tutors variable names.

## Consequences

Secrets passed with `-e` are visible to other processes of the same user while the reader runs. That is acceptable on a lecturer's own computer. An env file in a temporary folder is the follow-up if it isn't. The token change is visible in DESIGN.md's tokens, whose pixel sizes are now the 100% values.

## Specified by

STU-0030..STU-0035 (`spec/features/settings.feature`).
