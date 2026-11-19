---
target: load course screen
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/tutors-studio/src/ui/components/LoadCourse.svelte"
target_fingerprint: "sha256:cd9e8c722f8303dd61c73b5bd97bff0ae950961c2fd1314a1590656a22275ff9"
target_path: /home/user/tutors-studio/src/ui/components/LoadCourse.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-loadcourse-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 3. Load course — src/ui/components/LoadCourse.svelte

Seen in browser: partly. In the browser preview, "Load a course" skips the folder chooser and opens a demo Tutors course directly, so this screen is never reached. I mounted LoadCourse.svelte alone in the dev server (light and dark) with stub preview data (23 items, 10 weeks, 2 left-out files) to see its real rendering; behaviour otherwise reviewed from source.

## Design specificity verdict

Half specific. The promise sentence is authored ("Your folder is only read; the course is made as a new folder") and the left-out tray explains each file in lecturer terms. But the screen is a generic three-field form; the one thing that makes this flow special — Studio sorting a pile of slides into weeks — is reduced to a count ("Studio found 23 items across 10 weeks").

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                 |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 2         | Only counts are shown; which file lands in which week is invisible until after creation                                   |
| 2   | Match with real world           | 3         | "talk, note, lab, download or link" is Tutors-ish but explained                                                           |
| 3   | User control and freedom        | 3         | Cancel; original folder untouched                                                                                         |
| 4   | Consistency and standards       | 2         | 32px H1 (`--font-title`) vs Studio's 20/24 rule; eyebrow muted 12px not Paper eyebrow; native `<details>` with no chevron |
| 5   | Error prevention                | 2         | Lecturer commits without seeing the week assignment                                                                       |
| 6   | Recognition rather than recall  | 3         | Name pre-filled from folder                                                                                               |
| 7   | Flexibility and efficiency      | 2         | No way to correct a misplaced file before creating                                                                        |
| 8   | Aesthetic and minimalist design | 3         | Clean                                                                                                                     |
| 9   | Error recognition and recovery  | 3         | Per-field problems; failure line                                                                                          |
| 10  | Help and documentation          | 2         | Tray hint good; nothing on how week numbers are read from names                                                           |
|     | **Total**                       | **25/40** | **Acceptable**                                                                                                            |

## Cognitive load

- Failures: Visual hierarchy (folder name in quotes is the biggest thing on screen), Progressive disclosure inverted (the important preview is absent, the rare tray is the only detail).
- Decision points >4: none.
- Load: low-moderate (2).

## Emotional journey

High anxiety moment: "will it mess up my slides?" The copy answers that well. But "Studio found 23 items across 10 weeks" with no list leaves the lecturer guessing whether Week 7's lab went into Week 7. The left-out files appear only if they open a disclosure with no visible affordance.

## What's working

1. Reassurance up front: "Your folder is only read; the course is made as a new folder."
2. Each left-out file says why in plain words and what to do ("Drop them on a week once the course is made").
3. Name is tidied from the folder name (underscores/hyphens to spaces).

## Priority issues

- **[P1] No preview of where material goes.** What: `result.load` holds weeks and items, but the screen shows only `plural(items)` and `plural(weeks)`. Why: this is the "plan, then apply" moment for the biggest change Studio makes; the lecturer accepts it blind. Fix: render a compact contents list in LoadCourse.svelte under `.found` — one row per week with its items' type badges (reuse NodeDetail's `.type` badge style). Suggested command: $impeccable layout
- **[P2] The left-out disclosure has no affordance.** What: `<summary>` "2 files Studio will leave out" renders as plain 14px text with no chevron (seen). Why: lecturers miss that files were skipped. Fix: style `summary` per DESIGN "Disclosures" (44px row, chevron that turns), and use warning colour text for the count. Suggested command: $impeccable polish
- **[P2] Name starts as a tidied folder name, lower-case.** What: "web-dev_2025 material" becomes "web dev 2025 material". Why: becomes the student-facing title if not noticed. Fix: title-case the suggestion and add a hint "Students see this name". Suggested command: $impeccable clarify
- **[P3] Title shows the raw folder name in quotes at 32px.** Fix: "Make a course from your folder" as H1 with the folder name as muted meta; use `--font-heading`. Suggested command: $impeccable typeset

## Persona red flags

- **Jordan:** can't tell if "23 items" includes their exam paper.
- **Sam:** the date input is the browser's mm/dd/yyyy (US order even for Irish/UK lecturers in this locale); the summary-toggle has no visible focus/expand cue.
- **Dana (deadline):** would love this flow but can't verify it; after creating, has to open each week to check placement.

## Minor observations

- Dark mode renders correctly; the teal "Create the course" turns light teal with dark text as tokens intend.
- "Teaching starts (optional, for the calendar)" — "calendar" is not explained here.

## Questions to consider

- What if this screen were the course book itself in a "proposed" state — weeks on the left, items in place — with one "Make this course" button?
- Could each left-out file be dragged onto a week right here instead of after creation?

## Deterministic scan and browser evidence (Assessment B)

### 3 Load course — src/ui/components/LoadCourse.svelte

## CLI

exit 0, 0 findings.

## Browser

- Plain http://localhost:5199/ + "Load a course" does NOT reach LoadCourse.svelte: in the browser preview openCourse() returns an in-memory Tutors course, which opens as-is (course home of "Web Development"; overlay there: line-length ~100 chars p.hint "The course's learning outcomes...", overused-font Inter; axe 0/0). That is the shell, not this screen.
- http://localhost:5199/?material + "Load a course" (src/main.ts:233) reaches LoadCourse.svelte, heading 'Make a course from "web-dev-2026"'.
  - Overlay light: No anti-patterns found.
  - Overlay dark: 1 finding — low-contrast placeholder "Your name, as students see it" 3.7:1 (need 4.5:1), #757575 on #1b1b1b — input#load-lecturer (LoadCourse.svelte:56).

## axe

?material screen: light 0, dark 0.

## False positives

- low-contrast placeholder: real. #757575 is Chromium's default ::placeholder colour (no ::placeholder rule in paper-tokens.css or the component; only Companion.svelte styles one). Measured 4.3:1 on the light input (#f6f6f6), 4.1:1 on #111111 and 3.7:1 on #1b1b1b in dark. axe-core does not test placeholder contrast, so axe passing does not contradict it.

## Skipped

None beyond the note above (screen reached only through the ?material preview path). Screenshots: 3-load-course-material-light.png / -dark.png.
