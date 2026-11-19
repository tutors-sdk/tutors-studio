---
target: start screen
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/tutors-studio/src/ui/components/StartScreen.svelte"
target_fingerprint: "sha256:4e83b1c3f2fce61fa560b6c4ed1c9588289246a0a711852060aefed8a6aa41ba"
target_path: /home/user/tutors-studio/src/ui/components/StartScreen.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-startscreen-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 1. Start — src/ui/components/StartScreen.svelte

Seen in browser: yes (first run, no recent courses; light and dark at 1280x800). The "Your courses" list and Forget notice reviewed from source only.

## Design specificity verdict

Mostly category-interchangeable. A centred white card, an H1, a one-line promise and three buttons is the default "welcome" screen of any desktop tool. The copy is specific ("fix what's missing before your students notice") and Tutors Paper is respected (canvas, hairline panel, one teal button), but nothing in the composition says "course book" or "what students see". The paper-note helper in the corner is the only authored element, and it currently argues with the card.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                      |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------ |
| 1   | Visibility of system status     | 3         | Clear entry state; no hint of where a new course will be saved                 |
| 2   | Match with real world           | 3         | Plain lecturer words; "Load a course" vs "point at its folder" mixes metaphors |
| 3   | User control and freedom        | 3         | Every option is reversible; sample is promised to be separate                  |
| 4   | Consistency and standards       | 2         | Teal says "Start a new course", helper says "Try the sample course first"      |
| 5   | Error prevention                | 3         | Nothing risky here                                                             |
| 6   | Recognition rather than recall  | 3         | Recent list (source) shows name and path                                       |
| 7   | Flexibility and efficiency      | 2         | No keyboard default or shortcut; recent list only appears after first use      |
| 8   | Aesthetic and minimalist design | 3         | Calm, but the 4-line hint paragraph repeats what the buttons say               |
| 9   | Error recognition and recovery  | 3         | Notice + "Put it back" for forgotten courses (source)                          |
| 10  | Help and documentation          | 3         | Hint paragraph and helper                                                      |
|     | **Total**                       | **28/40** | **Good**                                                                       |

## Cognitive load

- Failures: Single focus (teal and helper point at different first steps), Visual hierarchy (third button wraps alone on its own row, reading as an afterthought or as a second group).
- Decision points >4 options: none (3 buttons + Settings link + 2 helper actions = 6 targets on first view if you count the bubble, which you should for a first-timer).
- Load: low-moderate (2 failures).

## Emotional journey

Peak: the promise sentence is warm and lecturer-shaped. Valley: two voices disagree about the first step, and the explanatory paragraph reads like a manual. End: no reassurance about where their course will live before they commit.

## What's working

1. One teal action, Paper card on canvas, 44px targets: exactly the token contract.
2. Copy names outcomes ("before your students notice", "Nothing you do there touches your own work").
3. Recent courses (source) show name + path with a non-destructive "Forget" and an explanation of what Forget does.

## Priority issues

- **[P1] Two competing "first things".** What: the teal primary is "Start a new course" while the helper bubble says "New to Studio? Try the sample course first." Why it matters: violates PRODUCT principle 2 (one next thing); a first-timer hesitates between the colour and the character. Fix: on first run (`offersSample(recent.length)` true) either make "Try it with a sample course" the teal `.primary` in StartScreen.svelte `.actions`, or drop the helper's first-run moment; never both pointing different ways. Suggested command: $impeccable clarify
- **[P2] The sample button wraps alone.** What: at 480px panel width "Try it with a sample course" breaks onto its own row under the other two. Why: reads as a different tier/group by accident. Fix: stack all three full-width in `.actions` (`flex-direction: column` on first run), or move the sample offer to a quiet text link under the buttons. Suggested command: $impeccable layout
- **[P2] Hint paragraph duplicates the buttons.** What: the 4-line `.hint` explains both flows in 14px muted text. Why: extraneous load; lecturers skim. Fix: cut to one sentence per button as button sub-labels, or remove and let the next screens explain themselves. Suggested command: $impeccable distill
- **[P3] Settings is an underlined grey text link** below the hint, unlike any other control. Fix: make it a header-action style button (DESIGN "Header actions") in the panel's top-right. Suggested command: $impeccable polish

## Persona red flags

- **Jordan (first-timer):** two instructions disagree; "Load a course" vs "point at its folder" — Jordan's slides aren't a "course" yet, so may not realise "Load" is the path for a folder of slides.
- **Sam (accessibility):** helper bubble is `role="status"` and appears on load, so a screen reader announces the helper before the page H1 has been read.
- **Dana (non-technical lecturer, deadline Friday):** wants "bring my slides in"; the only route to that is the third sentence of the hint paragraph under "Load a course". Will probably click teal "Start a new course" and rebuild by hand.

## Minor observations

- H1 "Tutors Studio" is the product name, not the task; an eyebrow + task title would follow DESIGN's page pattern.
- Dark mode is correct (tokens swap, teal lightens).
- No product artwork or the course-book idea on the very first screen; the helper is the only character.

## Questions to consider

- What if the first screen were a single sentence and one action ("Bring in your slides") with the other two as quiet links?
- Should the helper be silent on the screen that already has a teal button?

## Deterministic scan and browser evidence (Assessment B)

### 1 Start screen — src/ui/components/StartScreen.svelte

## CLI

`impeccable detect --json src/ui/components/StartScreen.svelte`: exit 0, 0 findings.

## Browser overlay (http://localhost:5199/, detect.js injected from live-server :8400, preflight title+script mutation OK)

`[impeccable] No anti-patterns found.`

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

None.

## Skipped

None. Screenshots: 1-start-light.png, 1-start-dark.png, 1-start-overlay.png.
