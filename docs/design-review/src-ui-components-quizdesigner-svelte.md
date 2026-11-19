---
target: quiz designer screen
total_score: 26
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/tutors-studio/src/ui/components/QuizDesigner.svelte"
target_fingerprint: "sha256:0cbecd03d2dc3dcb4ecea55642941622fb9247a9f3aabeb462637ca0ebfc3c12"
target_path: /home/user/tutors-studio/src/ui/components/QuizDesigner.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-quizdesigner-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 7. Quiz designer — src/ui/components/QuizDesigner.svelte

Seen in browser: yes — "Add a quiz" on week 2 (light and dark); save plan reviewed from source.

## Design specificity verdict

Moderately specific: "Choose an answer / True or false" as a kind switch, "Answers: tick the right one", "Add a code snippet" with an optional language, and a "Before anything changes" plan. The surface is a standard form builder; nothing borrows the quiz resource colour (#6366F1 tint) that would tie it to how students meet a quiz in Tutors.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Visibility of system status     | 3         | Clear "Question 1" fieldset; plan before writing                                                                         |
| 2   | Match with real world           | 2         | Eyebrow "NEW QUIZ IN TOPIC-02-JAVASCRIPT-ARRAYS" — a folder slug in default mode; plan says "Studio adds one new folder" |
| 3   | User control and freedom        | 3         | Cancel, Keep editing, remove/move question                                                                               |
| 4   | Consistency and standards       | 2         | Native blue radios; eyebrow muted not teal; Save quiz teal + Check and publish teal                                      |
| 5   | Error prevention                | 3         | Plan step; `problem` alert                                                                                               |
| 6   | Recognition rather than recall  | 3         | Labels on every field                                                                                                    |
| 7   | Flexibility and efficiency      | 2         | One question at a time; no paste-in of a question list                                                                   |
| 8   | Aesthetic and minimalist design | 3         | Calm, single column at reading width                                                                                     |
| 9   | Error recognition and recovery  | 3         | Problem line from domain check                                                                                           |
| 10  | Help and documentation          | 2         | Placeholders do the teaching; helper talks about dragging files                                                          |
|     | **Total**                       | **26/40** | **Acceptable**                                                                                                           |

## Cognitive load

- Failures: Visual hierarchy (answers' right/wrong state is a tiny blue radio), Single focus (helper).
- Decision points >4: none at start; grows linearly with questions.
- Load: low-moderate (2).

## Emotional journey

Starting is easy and the placeholders are friendly ("Which tag makes a link?", "Try these before the lab."). The low point is the file-system eyebrow at the top. End: a plan that names the new quiz — good — but mentions "folder".

## What's working

1. Question kind as a two-option switch, and True/False swapping the answer list for "The right answer".
2. Code snippet is an opt-in disclosure ("Add a code snippet" → "Remove the snippet").
3. Accessible naming: each answer input has `aria-label="Answer n"`, each radio "Answer n is right".

## Priority issues

- **[P1] Folder slug in the eyebrow.** What: "NEW QUIZ IN TOPIC-02-JAVASCRIPT-ARRAYS" with Advanced mode off. The prop comment says `where` should be "Week one"; App.svelte passes the path. Why: PRODUCT terms rule (no folder names outside Advanced). Fix: pass the week's title (`selectedNode.title`) as `where` in App.svelte's `openQuiz`; in QuizDesigner plan copy replace "one new folder with the quiz page in it" with "a new quiz in <week>". Suggested command: $impeccable clarify
- **[P2] The right answer is marked only by a small blue native radio.** What: `.answer input[type=radio]` unstyled; no visual change on the row. Fix: `accent-color: var(--ui-success)` plus a "Right answer" tag or tinted row for the checked answer. Suggested command: $impeccable polish
- **[P2] Quiz is an orphan entry point.** What: "Add a quiz" is a separate button on the week, not in "Add to this week → What it is". Fix: add Quiz to the kinds select; open the designer from there. Suggested command: $impeccable layout
- **[P2] Placeholder "Week one check" on a week-2 quiz.** Fix: derive from the week title ("Javascript Arrays check"). Suggested command: $impeccable clarify
- **[P3] Two teal buttons** (Save quiz + sidebar Check and publish). Fix: as in shell report, sidebar drops `.next` while a designer/editor is open. Suggested command: $impeccable polish

## Persona red flags

- **Jordan:** "TOPIC-02-JAVASCRIPT-ARRAYS" at the top looks like an error code.
- **Sam:** questions are fieldsets with legends (good); "Remove" link buttons for answers have specific aria-labels (good); radios don't scale at 200%.
- **Alex:** no bulk entry (paste 10 questions); no keyboard shortcut to add a question.
- **Dana (deadline):** fine for a 5-question check; slow for 20.

## Minor observations

- Inputs here are ~40px tall (below the 44px rule) and grey-filled.
- "Time each question" checkbox reveals "Seconds per question" — good progressive disclosure.
- No preview of how the quiz looks to students.

## Questions to consider

- Could the designer show each question as students will see it, editing in place?
- What if a lecturer could paste a numbered list of questions and answers and Studio built the form?

## Deterministic scan and browser evidence (Assessment B)

### 7 Quiz designer — src/ui/components/QuizDesigner.svelte

## CLI

exit 0, 0 findings.

## Browser overlay (week 1 → Add a quiz): 4 findings

- low-contrast placeholder "Week one check" 4.3:1 — input#quiz-heading
- low-contrast placeholder "Try these before the lab." 4.3:1 — textarea#quiz-intro
- low-contrast placeholder "Which tag makes a link?" 4.3:1 — textarea#q0-words (QuizDesigner.svelte:120)
- overused-font inter (body)
  Dark re-scan: same three placeholders at 4.1:1 (#757575 on #111111) + overused-font.

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

- low-contrast placeholder: real. #757575 is Chromium's default ::placeholder colour (no ::placeholder rule in paper-tokens.css or the component; only Companion.svelte styles one). Measured 4.3:1 on the light input (#f6f6f6), 4.1:1 on #111111 and 3.7:1 on #1b1b1b in dark. axe-core does not test placeholder contrast, so axe passing does not contradict it.
- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.

## Skipped

None.
