# 0030. Publish saves a compliant course; Netlify is optional and later

**Status:** Accepted
**Date:** 2026-11-09

## Context

Leigh: "The publish goal is a compliant tutors course saved locally that they can optionally push to netifly later. Compliance is the key here." Leigh then added: "Nothing should fail as we do continuous evaluation… at each step we validate names and keys." Until now, Publish led with a preview that needs containers, and with Netlify. Neither of those says the course itself is done.

## Decision

- Publish's first step, and its one teal action, is **Save the course**. `PublishingPort.save()`:
  - confirms the course passes the Tutors rules, refusing only a course with errors, which the course map already shows;
  - adds the standard setup the course lacks: `netlify.toml` and the `.gitignore` line for `json/` (ADR 0027).
    The course stays in its own folder; Leigh chose this over a separate copy (decision card, 2026-11-09).
- Pressing Save accepts the setup plan, because the sentence beside the button says the setup is added. This extends ADR 0027 from Send changes to Save. The plan goes through `applyPlan` as before.
- Save runs no generator and no container, so it can't fail on a missing tool. Building only happens for the preview, for the website and for Netlify.
- Netlify is marked optional and can be done at any time. Preview and Save as a website (ADR 0029) stay as quieter actions.
- The setup plan is shared between Save and the hand-off: it lives in `src/application/use-cases/standard-setup.ts`.
- The headless CLI gains `save`.

## Specified by

STU-0089 and STU-0090 (`spec/features/publishing.feature`).
