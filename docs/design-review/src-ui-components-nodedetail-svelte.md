---
target: week screen
total_score: 22
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/tutors-studio/src/ui/components/NodeDetail.svelte"
target_fingerprint: "sha256:3fc45b47e615f75b575e3295224181d7167b588f9e3f957a68d6c5688177ec3b"
target_path: /home/user/tutors-studio/src/ui/components/NodeDetail.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-nodedetail-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 5. Week — src/ui/components/NodeDetail.svelte

Seen in browser: yes — sample week "2: Javascript Arrays", a unit inside it, a lab (steps), rename and hide plans, a hidden week, the demo course's unpublished "Week 3", dark mode and 200% text.

## Design specificity verdict

The best-authored screen in structure: "What students will see" with resource-tinted Talk/Lab badges (gold, red), "1 thing to sort out" as a finding card with a 4px danger rule, "Before anything changes" plans in place, and "Let students see this … It's a [Week] / Make it a week". That is this product, not a template. It is let down by everything stacked under it: a generic "Add to this week" form, a "Change this week" admin panel and a release-date panel, all at the same weight as the content.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                                               |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 2         | After accepting "Hide … from students", nothing on the week title, row or contents says it is hidden                                                    |
| 2   | Match with real world           | 2         | Week subtitle "Topic"; rows "Unit"; page label "topic"; finding says "Rename it to topic-week-3"                                                        |
| 3   | User control and freedom        | 3         | Plans, Cancel, Put it back                                                                                                                              |
| 4   | Consistency and standards       | 2         | "Add a quiz" is a lone button outside "Add to this week"; inside a unit, an "Add a week" panel appears; the Lab row has no Earlier/Later while Talks do |
| 5   | Error prevention                | 2         | "Hide from students" and "Show to students again" are both enabled at once; "Remove to the bin" sits beside them at equal weight                        |
| 6   | Recognition rather than recall  | 2         | "What students will see" on a week shows only two "Unit" rows; the talks and labs are one click deeper                                                  |
| 7   | Flexibility and efficiency      | 2         | Drag or Earlier/Later; lab steps have 5 buttons per step                                                                                                |
| 8   | Aesthetic and minimalist design | 2         | ~1700px; five panels below the content                                                                                                                  |
| 9   | Error recognition and recovery  | 3         | Finding in lecturer words plus a one-click "Make it a week"                                                                                             |
| 10  | Help and documentation          | 2         | Inline hints good; helper bubble repeats onboarding                                                                                                     |
|     | **Total**                       | **22/40** | **Acceptable**                                                                                                                                          |

## Cognitive load

- Failures: Single focus, Chunking, Minimal choices, Visual hierarchy, Progressive disclosure.
- Decision points >4: "What it is" select (7 kinds: Lecture, Lecture written as slides, Lab, Reading, Link, Code repository, Video link); "Move to" select (~25 destinations, weeks and units interleaved); "Change this week" (Rename, Move, Hide, Show, Remove, Choose a picture = 6 actions); lab Steps (7 steps × Earlier/Later/Rename/Add a picture/Remove = 35 buttons).
- Load: high (5 failures).

## Emotional journey

Good start: title, then what students will see. Plans are reassuring ("Nothing is deleted, and this can be put back from Changes"). The valley: after hiding a week, the lecturer cannot see that it worked; after "Make it a week" they had to find the fix below the finding that told them to "Rename it to topic-week-3". End: "That's done, and nothing is left to fix. [Publish]" from the helper is a satisfying close.

## What's working

1. Resource badges in Paper tints (Talk gold, Lab red, Hidden neutral) make a unit scannable.
2. Plans appear in place, teal "Make this change" is the screen's single strong action while a plan is open.
3. The unpublished-week flow: finding card → "In here, but students won't see it yet" → "It's a Week / Make it a week" turns a rule into one decision.

## Priority issues

- **[P1] Hidden state is invisible, and both toggles are always offered.** What: "Hide from students" then "Make this change" leaves the week title, its contents row and its "Your weeks" row unchanged; "Hide from students" and "Show to students again" remain side by side, both enabled. Why: no feedback for a student-facing change; the lecturer can't tell the current state. Fix: in NodeDetail.svelte render one toggle based on the node's hidden flag, and show "Hidden from students" (muted, with release date if any) under the H2 and in Contents.svelte next to "Won't be published". Suggested command: $impeccable harden
- **[P1] "What students will see" on a week shows containers, not content.** What: the sample week shows two "Unit" rows only; the 4 talks and 1 lab need a click into each unit. Why: the screen's promise is the student view; the lecturer has to recall what's inside. Fix: render units as group headings with their items listed beneath (badges and titles), collapsing only past ~8 items. Suggested command: $impeccable layout
- **[P2] The fix is split from the finding.** What: finding card says "Rename it to topic-week-3."; the actionable control "Make it a week" is in a separate "Let students see this" panel below. Fix: place the `It's a / Make it a week` control inside the finding card as its action (the message stays from course-rules). Suggested command: $impeccable clarify
- **[P2] Destructive action at equal weight.** What: "Remove to the bin" is a default button in a row with Hide/Show. Fix: separate it at the end of the panel, danger-text style, with the plan doing the confirming. Suggested command: $impeccable harden
- **[P2] Wrong panels in context.** What: inside a unit, an "Add a week" form appears under the items; "Add a quiz" sits alone outside "Add to this week" whose kinds list omits Quiz. Fix: show "Add to this unit" inside units; add Quiz to the `What it is` select and drop the lone button. Suggested command: $impeccable layout

## Persona red flags

- **Jordan:** sees "Topic" under the title, "Unit" in rows, "topic" by the page — three names for the week's parts; hides the week and can't tell it worked.
- **Sam:** Hide/Show pair gives no state to a screen reader either (no aria-pressed); lab steps produce 35 tab stops before "Add the step".
- **Alex:** reordering a 7-step lab is one click per position; no drag handle visible on steps.
- **Dana (deadline):** wants to drop slides on the week; the drop zone is the fourth block down, below a form for typing titles.

## Minor observations

- Placeholder "CSS grid" in "Title students see" on a JavaScript Arrays week; "Week 5: Layout" placeholder on course home.
- Rename's input shows the current title as placeholder, so the field looks empty; "Rename" disabled until typed — fine but the current name isn't editable in place.
- Dark mode: unit badges become near-invisible dark-grey on dark-grey (`--ui-raised` on surface).
- 200%: contents column stacks above the week; the week's H2 starts ~590px down the first viewport.

## Questions to consider

- What if the week were the page students see, editable in place, with admin actions in a "…" menu on the title?
- Does a lecturer ever need "Move to" with 25 destinations, or would drag onto a week in the contents (already supported) suffice?

## Deterministic scan and browser evidence (Assessment B)

### 5 Week detail — src/ui/components/NodeDetail.svelte

## CLI: 1 finding (exit 2)

- side-tab (warning, slop) NodeDetail.svelte:527 `border-left: 4px solid var(--ui-info)` on `.findings li` (with .error/.warn colour variants).

## Browser overlay (week "1: Introducing Javascript"): 2 findings

- straggler "Javascript." alone on last of 2 lines (17% of measure) — drop-zone p "Drop slides, notes, labs or links here to add them to 1: Int..."
- overused-font inter (body)
  The sample week has no findings, so the side-tab cards were not rendered and the overlay could not confirm them.

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

- side-tab: the detector reads the CSS correctly (not a Svelte misread), but DESIGN.md line 568 mandates it: "A finding is a card with a 4px left rule in its severity's colour (danger, warning, info)." Contract-sanctioned, so not a defect against this design system; flag only as a question for the design review.
- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.
- line-length / straggler / unbalanced-heading: real but minor typographic measurements from rendered lines at 1280px; they depend on viewport width and Studio text-size setting.

## Skipped

None.
