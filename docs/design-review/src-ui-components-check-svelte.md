---
target: check and publish screen
total_score: 22
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/tutors-studio/src/ui/components/Check.svelte"
target_fingerprint: "sha256:ede70efc430ca361bb78e89a2f0e73c05bb54d7aa67cac4d7182e0c2af20bc4a"
target_path: /home/user/tutors-studio/src/ui/components/Check.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-check-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 9. Check and publish — src/ui/components/Check.svelte

Seen in browser: yes — sample course (0 problems, light), demo loaded course with 1 problem (light and dark, 200%). Publish button, Fix all safe, assistant permissions and git hand-off reviewed from source (the preview has no publishing port and no safe fixes in the demo).

## Design specificity verdict

The finding card (place link + course-rules sentence + 4px severity rule) is specific and matches DESIGN "States". The page around it is thin and generic: eyebrow, a 32px status headline, a list, "Back to the course". In the states seen, it is a report, not a workflow.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                     |
| --- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 2         | "Ready to publish" on a course whose every page is unwritten; sidebar still highlights "Course home"                          |
| 2   | Match with real world           | 2         | Studio's own line "Tutors will show every folder in this course"; finding copy (rules-owned) says "Rename it to topic-week-3" |
| 3   | User control and freedom        | 3         | Back to the course; plans for fixes                                                                                           |
| 4   | Consistency and standards       | 2         | 32px title; muted eyebrow; on this screen the sidebar button loses teal and nothing else gains it                             |
| 5   | Error prevention                | 3         | Publishing gated on errors                                                                                                    |
| 6   | Recognition rather than recall  | 2         | The fix lives on the week page; Check only links there                                                                        |
| 7   | Flexibility and efficiency      | 2         | "Fix all safe (n)" exists (source) but non-safe findings have no action here                                                  |
| 8   | Aesthetic and minimalist design | 3         | Spare                                                                                                                         |
| 9   | Error recognition and recovery  | 1         | A blocking problem with no button to fix it on the screen that names it                                                       |
| 10  | Help and documentation          | 2         | Helper "Show me" helps; no explanation of what "Check" checked                                                                |
|     | **Total**                       | **22/40** | **Acceptable**                                                                                                                |

## Cognitive load

- Failures: Visual hierarchy (no primary action when there is a problem), One thing at a time is fine, Working memory (must carry the finding to the week page and find "Make it a week" there).
- Decision points >4: none in the states seen; Advanced adds git card, assistant cards.
- Load: low-moderate (2).

## Emotional journey

"1 problem to fix before publishing" in 32px is alarming; the explanation is long and technical; the only obvious button is "Back to the course". With 0 problems the peak "Ready to publish" can be a dead end (no Publish when the port is missing) and is falsely reassuring for an empty course.

## What's working

1. Severity colour rule on the finding card, in both appearances; dark mode danger tint is legible.
2. Publishing is gated: "Preview and publish" only when `errors === 0 && canPublish`, and the screen's teal moves between Fix, Publish and Send via `checkNext`.
3. Assistant read permission copy is honest and specific (what is sent, who runs the model).

## Priority issues

- **[P1] A problem with no fix on the Check screen.** What: for findings without `finding.fix`, the card offers only the small underlined place link ("Week 3"). The working fix ("It's a Week → Make it a week") is on the week page below two other blocks. Why: Check is where lecturers go to fix; recovery heuristic fails. Fix: in Check.svelte `.findings li`, add a quiet "Sort it out" button that selects the node and scrolls to its fix, or render the same MakeVisible control inline for unpublished-folder findings. Suggested command: $impeccable clarify
- **[P1] "Ready to publish" with no way to publish.** What: when `canPublish` is false (browser preview, or any build without a publishing port) the page says "Ready to publish" and shows only "Back to the course". Why: dead end on the screen named "Check and publish". Fix: when `!canPublish`, say why and what to do ("Publishing works in the desktop app") next to the headline, or still show "Preview and publish" leading to Publish's explanation. Suggested command: $impeccable harden
- **[P2] Readiness ignores emptiness.** What: an 8-week course with every page "Not written yet" is "Ready to publish… Nothing to fix". Fix: add a non-blocking info line from existing week states ("8 weeks have nothing written yet — students will see empty pages"). Suggested command: $impeccable clarify
- **[P2] Studio copy says "folder".** What: `<p class="ok">Nothing to fix. Tutors will show every folder in this course.</p>` with Advanced off. Fix: "Students will see every week and page in this course." (Studio's own copy, so in scope). Suggested command: $impeccable clarify
- **[P3] Sidebar highlights a week while Check is open.** Fix: see shell report. Suggested command: $impeccable polish

## Persona red flags

- **Jordan:** reads "Rename it to topic-week-3", looks for a Rename button, finds none.
- **Sam:** H2 announces the count, findings are a list (good); the "Week 3" link is the only focusable element in the finding, and its purpose ("go to Week 3") isn't announced.
- **Alex:** "Fix all safe (n)" is good; nothing for unsafe ones in bulk.
- **Dana (deadline):** at 4pm Friday clicks Check and publish, sees a red problem and a Back button; uses the helper's "Show me" if they notice it.

## Minor observations

- With 0 problems, the green "ok" line repeats the sidebar's green "Everything checks out."
- Advanced git card puts "Branch main, pushed to origin" in the same card as the plain words — fine for Advanced.

## Questions to consider

- What if Check were a checklist of the whole course (written pages, hidden weeks, rule problems), each line with its own action, ending in Publish?
- Should the screen that names a problem always carry its fix?

## Deterministic scan and browser evidence (Assessment B)

### 9 Check and publish — src/ui/components/Check.svelte

## CLI: 2 findings (exit 2)

- side-tab Check.svelte:301 `border-left: 4px solid var(--ui-info)` (.findings li)
- side-tab Check.svelte:396 `border-left: 4px solid var(--ui-danger)` (.failure)

## Browser overlay (sidebar → Check and publish; "Ready to publish"): 1 finding

- overused-font inter (body)
  The sample course checks out, so no finding cards or failures render; the side-tab rules were not exercised in the browser.

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

- side-tab: the detector reads the CSS correctly (not a Svelte misread), but DESIGN.md line 568 mandates it: "A finding is a card with a 4px left rule in its severity's colour (danger, warning, info)." Contract-sanctioned, so not a defect against this design system; flag only as a question for the design review. (The .failure block at :396 is a push/publish failure, not a finding card; the DESIGN.md line covers finding cards explicitly, failures only by analogy.)
- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.

## Skipped

None.
