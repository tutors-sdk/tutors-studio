---
target: term view screen
total_score: 25
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/tutors-studio/src/ui/components/TermView.svelte"
target_fingerprint: "sha256:1f656a5d856c2708efea77b9c2859c41208ca3f1b2c737c92f7c8e822def18f1"
target_path: /home/user/tutors-studio/src/ui/components/TermView.svelte
timestamp: 2026-11-19T04-27-49Z
slug: src-ui-components-termview-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 12. Term view — src/ui/components/TermView.svelte (inside NodeDetail on course home)

Seen in browser: yes — set Teaching starts to 2026-09-14 (via plan), hid "3: Glitch Overview" until 1 Nov 2026 and "4: Web Applications" until 7 Dec 2026 (via plans), then course home. Today in the app is 19 Nov 2026.

## Design specificity verdict

Specific and useful: a "This term" panel that knows the teaching calendar, names the week now due ("3: Glitch Overview is due out since 1 Nov 2026") with a teal "Show 3: Glitch Overview to students", and lists what is still hidden with its date. It's the most "teaching-shaped" component in Studio. Visually it is one more white panel on a long page, and its state isn't echoed anywhere else.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                         |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3         | Clear "now" line and due list                                                                     |
| 2   | Match with real world           | 2         | "is due out since 1 Nov 2026" (ungrammatical); plan said "date its 8 weeks from 2026-09-14" (ISO) |
| 3   | User control and freedom        | 3         | Show is a plan                                                                                    |
| 4   | Consistency and standards       | 2         | Teal "Show … to students" and teal sidebar "Check and publish" on the same screen                 |
| 5   | Error prevention                | 3         | Plans                                                                                             |
| 6   | Recognition rather than recall  | 2         | Week rows and contents show no hidden/due state — only this panel does                            |
| 7   | Flexibility and efficiency      | 2         | One due week at a time; no "show all due"                                                         |
| 8   | Aesthetic and minimalist design | 3         | Compact                                                                                           |
| 9   | Error recognition and recovery  | 3         | n/a mostly                                                                                        |
| 10  | Help and documentation          | 2         | Nothing explains what "due out" means or that Studio won't publish automatically                  |
|     | **Total**                       | **25/40** | **Acceptable**                                                                                    |

## Cognitive load

- Failures: Working memory (must remember which weeks are hidden when looking at "Your weeks" right below), Single focus (two teal).
- Decision points >4: none.
- Load: low-moderate (2).

## Emotional journey

Pleasant surprise: Studio knows the term. Then confusion: "The 8 weeks of teaching are over." sits above a week that is due — and "Your weeks" below shows weeks 3 and 4 as plain "Still to write" rows, as if nothing were hidden.

## What's working

1. The due action names the outcome ("Show 3: Glitch Overview to students") and is the panel's single teal action (only the first due week gets teal).
2. Hidden weeks are listed with readable dates ("due out 7 Dec 2026").
3. It appears only when it has something to say (start date set).

## Priority issues

- **[P1] Hidden/due state lives only in this panel.** What: weeks 3 and 4 are hidden, but their "Your weeks" rows and contents entries show no mark. Why: lecturers scan the book, not the panel; a hidden week looks published. Fix: add "Hidden until 7 Dec" (muted) / "Due — hidden" (warning) to the NodeDetail week rows and Contents.svelte entries, from `term.hidden`. Suggested command: $impeccable harden
- **[P2] Grammar and date formats.** What: `dueWords` → "is due out since 1 Nov 2026"; plan sentence uses "2026-09-14". Fix: "was due out on 1 Nov 2026 and is still hidden"; format plan dates with `readableDate`. (Studio-owned copy in src/domain/term.ts and the details plan.) Suggested command: $impeccable clarify
- **[P2] Two teal voices.** What: "Show … to students" and sidebar "Check and publish" both teal. Fix: the sidebar's `.next` should yield when the open page has its own next action. Suggested command: $impeccable polish
- **[P3] "Over" vs "due" framing.** What: "The 8 weeks of teaching are over." then a due week. Fix: when weeks are still hidden after the term, lead with that ("Teaching ended 9 Nov; 1 week was never shown"). Suggested command: $impeccable clarify

## Persona red flags

- **Jordan:** "due out" — does Studio publish it automatically on the date? The panel doesn't say it won't.
- **Sam:** the panel is a section with H3; due items aren't a list; the hidden list is. Fine.
- **Dana (deadline):** wants "what do I need to do this week?" — the panel nearly answers it but doesn't name the current week number during term.

## Minor observations

- The Teaching starts field appears twice on course home (Course details and the collapsed "Start next year from this one"), both labelled "Teaching starts".
- The panel sits above "Your weeks", pushing the weeks down another ~260px on an already long page.

## Questions to consider

- What if the contents column itself showed the calendar — a date beside each week, greyed when hidden?
- Should "Show to students" for all due weeks be one action?

## Deterministic scan and browser evidence (Assessment B)

### 12 Term view — src/ui/components/TermView.svelte

## CLI

exit 0, 0 findings.

## Browser

Reached: Course home → Course details → Teaching starts = 2026-09-14 → Save details → "Make this change" (in-memory preview course only; the repo is untouched). "This term" heading then appears on course home.
Overlay: 2 findings, both outside TermView (same as shell): line-length ~100 chars p.hint (Outcomes hint), overused-font inter. Nothing flagged inside the term view.

## axe

light 0, dark 0 (term state set up again in a fresh dark context).

## False positives

- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.

## Skipped

None.
