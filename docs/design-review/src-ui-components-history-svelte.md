---
target: changes screen
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
target_identity: "file:/home/user/tutors-studio/src/ui/components/History.svelte"
target_fingerprint: "sha256:c88abf424fb9123508fad3320e74347ce5f381e69dee51a97bd70e4d1626f31e"
target_path: /home/user/tutors-studio/src/ui/components/History.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-history-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 8. Changes — src/ui/components/History.svelte

Seen in browser: yes — empty state, after a rename and a hide, and the "Put back" plan.

## Design specificity verdict

Specific in intent ("What Studio changed since you opened this course", "Put back", the undo shown as a plan), generic in form (a list of timestamped rows with a button each). It does its job; it doesn't connect changes to the weeks they touched.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                  |
| --- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3         | Each change listed with time; undone entries marked "(put back)"                                           |
| 2   | Match with real world           | 3         | Lecturer words                                                                                             |
| 3   | User control and freedom        | 3         | Every change can be put back, through a plan                                                               |
| 4   | Consistency and standards       | 2         | 32px title wrapping to two lines; eyebrow is 14px muted sentence-case, unlike other screens' caps eyebrows |
| 5   | Error prevention                | 3         | Undo is planned first                                                                                      |
| 6   | Recognition rather than recall  | 2         | Time only (no date), no link to the week; history scoped to this session                                   |
| 7   | Flexibility and efficiency      | 2         | No "put back everything since…"                                                                            |
| 8   | Aesthetic and minimalist design | 3         | Clean list                                                                                                 |
| 9   | Error recognition and recovery  | 3         | Failure message per entry                                                                                  |
| 10  | Help and documentation          | 3         | Empty state explains the screen                                                                            |
|     | **Total**                       | **27/40** | **Acceptable**                                                                                             |

## Cognitive load

- Failures: Working memory (lecturer must remember what "Hide '2: Arrays'" refers to after renames; times only).
- Decision points >4: none for short sessions; long sessions get many identical "Put back" buttons.
- Load: low (1).

## Emotional journey

Reassuring: the empty state promises every change can be put back. The undo plan's copy is the weak moment: "Put back: hide "2: Javascript Arrays" from students. Anything this change added goes to the bin…" — reads at first as if it will hide the week, and mentions a bin for a change that added nothing.

## What's working

1. Undo is itself a plan with a teal "Put it back" — consistent with ADR 0004.
2. Empty state copy: "Nothing yet. Every change Studio makes is listed here, and each can be put back."
3. Rows are compact and scannable; Put back has a specific aria-label.

## Priority issues

- **[P2] Undo plan copy is ambiguous.** What: "Put back: hide "X" from students. Anything this change added goes to the bin…". Fix: "Show "X" to students again, as before." and include the bin sentence only when the plan has additions (`plan.ops` with writes). Suggested command: $impeccable clarify
- **[P2] Changes don't lead to their place.** What: entries are plain text. Fix: make the week name in each summary a link that selects that node (onSelect is available in App.svelte). Suggested command: $impeccable layout
- **[P2] Scope and time are thin.** What: "since you opened this course" and `toLocaleTimeString` only. Why: a lecturer who closes Studio and comes back can't put back yesterday's change (needs confirming against the session model). Fix: date headers ("Today", "Yesterday") and persist history per course if the session allows. Suggested command: $impeccable harden
- **[P3] Title size.** What: 32px H2 wraps at 1280px. Fix: `--font-heading` (24px) per Studio rule, eyebrow "CHANGES" in Paper eyebrow style. Suggested command: $impeccable typeset

## Persona red flags

- **Jordan:** unsure whether "Put back" on an older row also undoes the newer rows after it.
- **Sam:** the inline plan is `role="dialog" aria-modal="false"` with no focus move — a screen reader user may not know it appeared.
- **Dana (deadline):** after a burst of edits, wants "undo everything from this morning"; must click each.

## Minor observations

- The sidebar keeps a week row selected while Changes is open; "Changes" link is underlined as current, so two "you are here" marks.
- The global "Done: …" notice stays above the Changes title, duplicating the top row.

## Questions to consider

- Could the course book itself show a small "changed today" mark on weeks, with Changes as the detail?
- Should Put back on an old change warn when later changes depend on it?

## Deterministic scan and browser evidence (Assessment B)

### 8 Changes — src/ui/components/History.svelte

## CLI

exit 0, 0 findings.

## Browser overlay (sidebar → Changes): 2 findings

- unbalanced-heading: last of 2 lines is 16% as wide as the line above — h2#history-title "What Studio changed since you opened this course"
- overused-font inter (body)

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.
- line-length / straggler / unbalanced-heading: real but minor typographic measurements from rendered lines at 1280px; they depend on viewport width and Studio text-size setting.

## Skipped

None. The sample session has no changes, so only the empty state was scanned.
