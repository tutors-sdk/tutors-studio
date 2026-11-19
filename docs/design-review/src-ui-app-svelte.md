---
target: shell course home screen
total_score: 24
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/tutors-studio/src/ui/App.svelte"
target_fingerprint: "sha256:c8f4e1818c1f4e0019edd82404dc52c59756f38c29516f712956515164b1f1fe"
target_path: /home/user/tutors-studio/src/ui/App.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-app-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 4. Shell / course home — src/ui/App.svelte + CourseSidebar.svelte (course home via NodeDetail)

Seen in browser: yes — sample course home, new course home (12 weeks), loaded demo course with a "Won't be published" week, Advanced mode, dark mode, 200% text.

## Design specificity verdict

Specific in structure, generic in surface. The contents column of weeks beside the open week, "Won't be published" under a week name in danger text, and the paper-note helper are authored for this product and match the surface contract ("a course reads as a book of weeks"). But the course home itself is a long admin page: eight stacked panels (Your weeks, Add a week, drop zone, Course details, What students can do, Card picture, Start next year, the course page) that could belong to any CMS settings screen. The "book" metaphor stops at the sidebar.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                                           |
| --- | ------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 2         | "Everything checks out." (green) on a course where every week says "Still to write"; a hidden week shows no state in the contents                   |
| 2   | Match with real world           | 2         | "Your weeks" lists rows badged "Topic", "Unit", "Side unit"; the course page is labelled "course"                                                   |
| 3   | User control and freedom        | 3         | Every change is a plan with "Put it back" in the notice                                                                                             |
| 4   | Consistency and standards       | 2         | Teal "Check and publish" coexists with other teal actions (editor Save, term view, plans); sidebar keeps "Course home" selected while Check is open |
| 5   | Error prevention                | 3         | Plans before writes                                                                                                                                 |
| 6   | Recognition rather than recall  | 3         | Contents always visible                                                                                                                             |
| 7   | Flexibility and efficiency      | 2         | 8 rows × Earlier/Later = 16 extra buttons; no keyboard shortcuts beyond zoom                                                                        |
| 8   | Aesthetic and minimalist design | 2         | ~2200px of stacked panels on course home                                                                                                            |
| 9   | Error recognition and recovery  | 3         | Sidebar summary turns red with a count                                                                                                              |
| 10  | Help and documentation          | 2         | Helper bubble always out, often off-topic                                                                                                           |
|     | **Total**                       | **24/40** | **Acceptable**                                                                                                                                      |

## Cognitive load

- Failures: Single focus, Chunking (8 panels), Minimal choices, Progressive disclosure (Outcomes, Card picture, Next year, Course page always open), Visual hierarchy (weeks list and forms have equal weight).
- Decision points >4: Your weeks (8 rows + 16 Earlier/Later buttons); "Add a week" select + field + button; sidebar footer (Check and publish + 3 links + helper).
- Load: high (5 failures).

## Emotional journey

Opening the sample is reassuring (notice: "This is a sample course… your own courses are separate"; green "Everything checks out"). The valley comes on scroll: forms for outcomes, pictures and next year appear before the lecturer has added a single slide. End: teal "Check and publish" invites publishing a course that has nothing written — false confidence at the highest-stakes moment.

## What's working

1. The contents column: plain week titles, a "Won't be published" danger line under a broken week, tonal fill + 2px teal underline for the selected row, exactly as DESIGN specifies.
2. Success notices carry their own undo ("Done: Rename … Put it back").
3. At 200% text the layout reflows to one column with no horizontal scroll (checked: `scrollWidth <= innerWidth`).

## Priority issues

- **[P1] Status says "Everything checks out" for an empty course, and teal points at publishing.** What: CourseSidebar.svelte `.summary` only counts rule errors; `class="next"` on Check and publish whenever `errors === 0`. Why: PRODUCT principle 2 — the next thing for a new course is adding material, not publishing; green reassurance on 0/8 written weeks misleads. Fix: add a second state line from the existing "Still to write" data ("8 weeks still to write") and only make Check and publish teal when something is written; otherwise leave teal for the week's drop zone. Suggested command: $impeccable clarify
- **[P1] Course home is a kitchen sink.** What: NodeDetail for `path === ""` renders weeks, Add a week, drop zone, Course details, Outcomes, Card picture, Start next year, course page, all open. Why: chunking and progressive disclosure failures; the weeks list is lost. Fix: keep "Your weeks" + drop zone; move Course details/Outcomes/Card picture/Next year into a "Course settings" disclosure group or a tab on course home. Suggested command: $impeccable distill
- **[P2] Earlier/Later on every row.** What: two 44px buttons per row (16 on the sample home), disabled ends greyed. Why: visual noise and doubled tab stops; drag is offered too. Fix: show Earlier/Later only on the hovered/focused row or behind a "Reorder" toggle. Suggested command: $impeccable quieter
- **[P2] Tutors kinds leak into "Your weeks".** What: badges "Topic", "Unit", "Side unit"; page label "course" (lower-case); new courses show "Weeks 1–4" units under a heading "Your weeks". Fix: badge weeks as "Week", units as "Block of weeks"; drop the kind badge where every row is the same kind. Suggested command: $impeccable clarify
- **[P2] Sidebar selection lies on non-week screens.** What: with Check open the contents keep "Course home" (or the last week) highlighted; with Changes open "2: Arrays" stays selected. Fix: in CourseSidebar/Contents pass `selected = ""`-none when `checkOpen || historyOpen || publishingOpen`. Suggested command: $impeccable polish

## The helper (Companion.svelte) — shell-wide notes

- The bubble is on screen on almost every screen, and its onboarding line "Open a week, then drag a file from your computer onto it to see where Studio puts it." persists into Settings, the page editor and the quiz designer — contradicting its own Settings copy "never while you're working".
- At 1280px it sits in the right gutter; in the editor it overlaps the preview pane; at 200% text its width doesn't grow, so text runs one word per line and the bubble covers the contents column.
- Uses neutral buttons (never teal) as specified; "Not now" / "Hide helper" are clear; Escape dismisses it from anywhere (window-level keydown), which can swallow Escape meant for other controls.

## Persona red flags

- **Jordan:** sees "Topic" on rows titled "1: Introducing Javascript" under "Your weeks" — is a topic a week? Green "Everything checks out" suggests the course is done.
- **Sam:** two `h1`s per screen (sidebar course title and none in main; main uses h2); 16 Earlier/Later tab stops before reaching "Add a week".
- **Alex (power user):** no keyboard reordering or jump-to-week; must scroll past 6 panels to reach the course page's Write.
- **Dana (deadline):** opens new course, sees forms for outcomes and card pictures, unsure what is required before Friday.

## Minor observations

- "Course" muted line under the H1 does the eyebrow's job in the wrong position and style (DESIGN: teal 11px eyebrow above the title).
- In Advanced mode, folder names under each contents row (topic-01-…) double the sidebar height; the sidebar list then scrolls behind the footer.
- Status bar ("Course rules 0.1.0 / Assistant: none") appears only in Advanced — good.

## Questions to consider

- What if course home were the open book's contents page — weeks with what's written in each — and every course-wide setting lived behind one "Course settings" link?
- Should the helper speak at most once per screen visit and then fold to the note?

## Deterministic scan and browser evidence (Assessment B)

### 4 Shell — src/ui/App.svelte + src/ui/components/CourseSidebar.svelte

## CLI

App.svelte exit 0, 0 findings; CourseSidebar.svelte exit 0, 0 findings.

## Browser overlay (sample course, Course home): 2 findings

- line-length ~100 chars on 2 of 2 rendered lines — p.hint.svelte-1hwe7q6 "The course's learning outcomes, each with how deeply student..." (Outcomes hint on course home)
- overused-font: Primary font inter (100% of text) — body

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.
- line-length / straggler / unbalanced-heading: real but minor typographic measurements from rendered lines at 1280px; they depend on viewport width and Studio text-size setting.

## Skipped

None.
