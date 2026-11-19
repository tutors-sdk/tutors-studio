---
target: publish screen
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/tutors-studio/src/ui/components/Publish.svelte"
target_fingerprint: "sha256:10bf3bf837cfd6ee42c59ec80d17a3e8612e3bb73d8895a978f7153875ef39bd"
target_path: /home/user/tutors-studio/src/ui/components/Publish.svelte
timestamp: 2026-11-19T04-27-49Z
slug: src-ui-components-publish-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 10. Publish — src/ui/components/Publish.svelte

Seen in browser: partly. The preview only shows the desktop-only notice ("Saving and publishing work in the desktop app, not this browser preview." + Back to the course), reached via the helper's "Publish". The real states (sign-in, choose address, online, save, live, website, progress, outcome) are reviewed from source and `src/domain/publishing-words.ts`.

## Design specificity verdict

Copy is specific and kind ("Put your course online for your students", "Sign in to Netlify once … you only do this once", "Students will read it at tutors.dev/course/web-dev-2026"). The structure is a generic stack of option cards, and the one moment that should feel like an event — the course going live — ends as a paragraph and a link at the bottom of the page.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                |
| --- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 2         | Progress `ol.steps` and the outcome render after all cards, far below the button pressed |
| 2   | Match with real world           | 2         | "compliant", "Course address" with Netlify site-name rules, "setup Tutors expects"       |
| 3   | User control and freedom        | 3         | Back to the course; nothing published without a press                                    |
| 4   | Consistency and standards       | 2         | 32px title; quiet cards look like primary cards with no fill                             |
| 5   | Error prevention                | 3         | Buttons disabled with "Sort out the n things … first"                                    |
| 6   | Recognition rather than recall  | 3         | Remembers the site; "Last published on … Since then:" list                               |
| 7   | Flexibility and efficiency      | 2         | Four routes (Publish, Save, Live, Website) shown at once                                 |
| 8   | Aesthetic and minimalist design | 2         | Up to four cards for one decision                                                        |
| 9   | Error recognition and recovery  | 3         | Plain reason + collapsible "Technical details"                                           |
| 10  | Help and documentation          | 3         | One-time sign-in guidance names the exact Netlify path                                   |
|     | **Total**                       | **25/40** | **Acceptable**                                                                           |

## Cognitive load

- Failures: Minimal choices (Publish / Just save it / Live in Tutors / As a website), Single focus, Visual hierarchy (feedback location).
- Decision points >4: up to 4 routes + address field + link; borderline.
- Load: moderate (3).

## Emotional journey

Highest-stakes moment in the product. The address step is clear, the sign-in step is reassuring. The end — "Your course is published." in a result block below "As a website on this computer" — undersells the peak and may be off-screen at 1280x800. The Check screen's button says "Preview and publish", but the Publish screen has no preview step unless the Live-in-Tutors card is present.

## What's working

1. "Since then:" list of changes since last publish — exactly what a lecturer needs before republishing.
2. Blocking copy points back to Check rather than failing silently.
3. Technical detail is hidden behind a disclosure for non-Advanced users.

## Priority issues

- **[P1] Progress and result appear at the bottom, away from the action.** What: `{#if steps.length > 0}<ol class="steps">` and the outcome block come after every card. Why: after pressing "Publish for students" at the top, the lecturer sees nothing change in view. Fix: render steps and outcome inside the card whose button started them (track `busy` origin), and make the success state replace the card ("Your course is online — Open it"). Suggested command: $impeccable layout
- **[P1] "Preview and publish" promises a preview that isn't there.** What: Check's button label vs. a Publish screen whose first card is "Choose your course's address". Fix: either put the Live-in-Tutors preview first ("See it as students will") or rename the Check button "Publish…". Suggested command: $impeccable clarify
- **[P2] Too many routes at once.** What: Publish, "Just save it on this computer", Live, "As a website…" all visible. Fix: one primary card; the rest under "Other ways to share" disclosure. Suggested command: $impeccable distill
- **[P2] Jargon in Studio's own copy.** What: "Your course is compliant and saved in its own folder"; address rule "lower-case letters, digits and single hyphens". Fix: "Your course passed the check and is saved." and offer a suggested address with an "Edit" link rather than a raw rule. Suggested command: $impeccable clarify
- **[P3] Preview build is a dead end.** What: only a notice and Back. Fix: show the cards disabled with the notice, so the preview teaches the flow. Suggested command: $impeccable onboard

## Persona red flags

- **Jordan:** "Course address" — doesn't know it becomes the URL students use; the help line explains only after valid input.
- **Sam:** steps list has `aria-live="polite"` (good); success is `role="status"`; focus isn't moved to the outcome, and it's far down the page.
- **Dana (deadline):** presses Publish, sees no change in the viewport for the length of a build.

## Minor observations

- `quiet-card` is transparent with a hairline — reads as disabled next to the white card.
- Advanced shows "Students read it at" followed by a link button — fine.

## Questions to consider

- What would it look like if publishing ended on the student's view of the course, opened, with "This is live" above it?
- Does a lecturer need "As a website on this computer" on the main path at all?

## Deterministic scan and browser evidence (Assessment B)

### 10 Publish — src/ui/components/Publish.svelte

## CLI: 1 finding (exit 2)

- side-tab Publish.svelte:322 `border-left: 4px solid var(--ui-danger)` (.failure)

## Browser

SKIPPED: unreachable in the browser preview. App.svelte shows Publish only when pane.kind === "publishing", set by Check's "Preview and publish" button, which renders only when canPublish (course.publishing !== null). In the preview openCourse() sets publishing: null (src/main.ts:245), and the helper's guide only routes to "check", not "publish". No overlay or axe run.

## False positives

- side-tab: the detector reads the CSS correctly (not a Svelte misread), but DESIGN.md line 568 mandates it: "A finding is a card with a 4px left rule in its severity's colour (danger, warning, info)." Contract-sanctioned, so not a defect against this design system; flag only as a question for the design review.

## Note

The same 4px danger rule also appears in LiveTutors.svelte:170 (not a target).
