---
target: new course screen
total_score: 26
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/tutors-studio/src/ui/components/NewCourse.svelte"
target_fingerprint: "sha256:3dec998e5fabce5cce37ba2feaaa68b8e4da18436278e4219c952712c7df1440"
target_path: /home/user/tutors-studio/src/ui/components/NewCourse.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-newcourse-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 2. New course — src/ui/components/NewCourse.svelte

Seen in browser: yes (empty-name error, all three step-2 choices, step 3 "Shape my own week", create → course home).

## Design specificity verdict

Partly specific. The questions are asked in teaching terms ("How does a teaching week break down?", "Lectures, with slides", "Students build a project across the weeks") and the live summary line ("Each of the 12 weeks starts with 1 lecture and 1 lab…") is genuinely authored for this product. But the form chrome is generic wizard: native browser-blue radios, grey-filled inputs, a select of reference courses, Back/Continue. Step 2 leaks the Tutors ecosystem's own vocabulary ("reference course", "sections", a GitHub slug).

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                         |
| --- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3         | "1 of 2" eyebrow, but the total silently becomes "2 of 3" when "Shape my own week" is picked                      |
| 2   | Match with real world           | 2         | "A reference course", "Reference Course" as an option, "3 sections", "shaped on edeleastar/module-web-dev-2-2022" |
| 3   | User control and freedom        | 3         | Back and Cancel on every step; answers kept                                                                       |
| 4   | Consistency and standards       | 2         | Native blue radios (a second accent colour) and grey-fill inputs unlike every other form                          |
| 5   | Error prevention                | 3         | Validation per step, numbers bounded                                                                              |
| 6   | Recognition rather than recall  | 3         | Choices carry descriptions; live summary on step 3                                                                |
| 7   | Flexibility and efficiency      | 2         | Enter submits; no way to see the resulting week structure before creating                                         |
| 8   | Aesthetic and minimalist design | 3         | Clean panel; step 2 is dense (3 cards + select + paragraph)                                                       |
| 9   | Error recognition and recovery  | 3         | "Give the course a name with at least one letter or number." inline, red border                                   |
| 10  | Help and documentation          | 2         | The helper keeps saying "Try the sample course first" during the form                                             |
|     | **Total**                       | **26/40** | **Acceptable**                                                                                                    |

## Cognitive load

- Failures: Minimal choices (step 2: 3 approaches + a 5-item select, or 6 week-count pills), Progressive disclosure (reference course pre-selected with an 8-week Node.js course), One thing at a time (the helper bubble competes on every step).
- Decision points >4 options: step 2 reference select (5 courses); "How many teaching weeks?" (6 pills, fine as a scale).
- Load: moderate (3 failures).

## Emotional journey

Step 1 is effortless. Step 2 is the valley: a lecturer of, say, nursing finds "Web Development II" pre-selected and a GitHub repo name in the description. Step 3 has a nice peak: the summary sentence updates as numbers change. End: after "Create course", a notice "Created … Each week's topic is ready" and the helper says "Your weeks are ready. Choose one and drop your slides onto it" — a good, specific next step.

## What's working

1. The live sentence on step 3 ("Each of the 12 weeks starts with 1 lecture and 1 lab, ready for your material. A module handbook and an introduction sit beside the weeks.") makes the consequence visible before committing.
2. Week counts as pill radios with a consequence line ("3 sections, week 12 a review with a quiz") rather than a free number.
3. Errors are inline, specific and tied to the field with aria-describedby.

## Priority issues

- **[P1] Default start is a subject-specific reference course.** What: `start` defaults to `REFERENCE`, so step 2 opens on "Web Development II … JavaScript and Node.js web apps over 8 weeks … 51 items". Why: a lecturer outside computing who presses Create gets eight weeks of someone else's titles; the most likely generic need (lecture + lab per week) is option 2. Fix: in NewCourse.svelte default `start` to the first `courseTemplates` entry (or `OWN`), and present reference courses as "Copy the shape of a real course" lower down. Suggested command: $impeccable clarify
- **[P1] Ecosystem jargon on step 2.** What: "Start from a reference course, a template, or your own week?" (the visible option is not called "template"), the select option "Reference Course", "3 sections", "shaped on edeleastar/module-web-dev-2-2022". Why: PRODUCT terms rule — say week/topic/page; a repo slug means nothing to the primary user. Fix: rewrite the h1 to match the three option names; drop `picked.modelledOn` unless Advanced; rename "sections" to "blocks of weeks (Weeks 1–4…)". Suggested command: $impeccable clarify
- **[P2] Native radios in browser blue.** What: `.choice input` and `.length input` have no `accent-color`, so they render #0a66d6-ish blue; Settings.svelte sets `accent-color: var(--ui-brand)`. Why: a second accent in the chrome (DESIGN Don'ts). Fix: add `accent-color: var(--ui-ink)` (selection is shown by the card border already) to `input[type=radio]` in NewCourse.svelte. Suggested command: $impeccable polish
- **[P2] Step total changes under the user.** What: eyebrow reads "1 of 2", then "2 of 3" after choosing "Shape my own week". Fix: say "Step 2" without a total until the path is fixed, or always count 3 and skip. Suggested command: $impeccable clarify
- **[P2] Helper repeats the start-screen nudge mid-form and overlaps the panel edge** at 1280px (bubble x≈1037, panel right edge 1060). Fix: Companion moments should not fire on NewCourse; see shell report. Suggested command: $impeccable quieter

## Persona red flags

- **Jordan:** doesn't know what a "reference course" is, takes the default because it's selected, ends with WeatherTop assignments.
- **Sam:** the choice cards indicate selection only with a 1px ink border change and a small native radio; at 200% the radios don't scale (they stay ~13px).
- **Dana (deadline):** wanted "12 weeks, a lecture and a lab"; has to notice option 2, then find "12" in the pill row; fine once found, but no preview of the week list before Create.

## Minor observations

- Inputs use `--ui-canvas` fill (grey) while DESIGN says inputs are surface (white); Course details on course home uses white — inconsistent.
- Placeholder "Web Development" in Course name looks like a pre-filled value at a glance (muted on grey).
- No indication of where the new course is saved on disk until after creation.

## Questions to consider

- Could step 2 show a small live "contents" preview (Week 1 … Week 12, with badges) so the choice is visual rather than verbal?
- Does a lecturer need to choose between "template" and "reference course" at all, or is it one list of shapes?

## Deterministic scan and browser evidence (Assessment B)

### 2 New course — src/ui/components/NewCourse.svelte

## CLI

exit 0, 0 findings.

## Browser overlay

Step 1 (Start a new course; heading "What is the course called, and who teaches it?"): 2 findings

- low-contrast placeholder "Web Development" 4.3:1 (need 4.5:1), #757575 on #f6f6f6 — input#name (NewCourse.svelte:81)
- low-contrast placeholder "Your name, as students see it" 4.3:1 — input#lecturer (NewCourse.svelte:87)
- Dark re-scan: same two placeholders flagged (text #757575 on dark field).
  Step 2 (after #name filled + Continue; "Start from a reference course, a template, or your own week?"): 1 finding
- line-length ~111 chars on 2 of 3 rendered lines (aim <80) — p#example-hint.hint

## axe

Step 1 and step 2: light 0, dark 0.

## False positives

- low-contrast placeholder: real. #757575 is Chromium's default ::placeholder colour (no ::placeholder rule in paper-tokens.css or the component; only Companion.svelte styles one). Measured 4.3:1 on the light input (#f6f6f6), 4.1:1 on #111111 and 3.7:1 on #1b1b1b in dark. axe-core does not test placeholder contrast, so axe passing does not contradict it.
- line-length / straggler / unbalanced-heading: real but minor typographic measurements from rendered lines at 1280px; they depend on viewport width and Studio text-size setting.

## Skipped

"Create course" was not pressed: it creates a course (state change) and the review target is the form; the created course lands in the shell (screen 4).
