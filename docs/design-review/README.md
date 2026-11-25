# Design review of every screen

The design doc's P3 asks for "an Impeccable critique and audit per screen, each recorded" (ADR 0011). The first full review ran on 2026-11-19. Each screen's critique is in this folder, named after its source file (a copy of the snapshot Impeccable keeps in `.impeccable/critique/`, which stays on the computer that ran it). Each snapshot holds two independent assessments:

- **A, the design review:** Nielsen's ten heuristics, cognitive load, personas and priority issues.
- **B, the evidence:** the Impeccable detector on the source, its overlay in the browser preview, and axe-core in light and dark.

`tests/architecture/design-review.test.ts` fails if a screen has no recorded critique.

| Screen               | Source                                  | Score /40 | P1 issues |
| -------------------- | --------------------------------------- | --------- | --------- |
| Start                | `src/ui/components/StartScreen.svelte`  | 28        | 1         |
| New course           | `src/ui/components/NewCourse.svelte`    | 26        | 2         |
| Load a course        | `src/ui/components/LoadCourse.svelte`   | 25        | 1         |
| Your library         | `src/ui/components/Library.svelte`      | 29        | 0         |
| The course and shell | `src/ui/App.svelte`                     | 24        | 2         |
| A week               | `src/ui/components/NodeDetail.svelte`   | 22        | 2         |
| Writing a page       | `src/ui/components/PageEditor.svelte`   | 21        | 2         |
| Quiz designer        | `src/ui/components/QuizDesigner.svelte` | 26        | 1         |
| Changes              | `src/ui/components/History.svelte`      | 27        | 0         |
| Check and publish    | `src/ui/components/Check.svelte`        | 22        | 2         |
| Publish              | `src/ui/components/Publish.svelte`      | 25        | 2         |
| Settings             | `src/ui/components/Settings.svelte`     | 29        | 1         |
| The term             | `src/ui/components/TermView.svelte`     | 25        | 1         |

No screen has a P0. The detector found 4 side-tab hits (finding cards, which DESIGN.md asks for) and nothing else in the source. axe-core found one moderate issue: Settings has no `h1`.

## What repeats across screens

- **Too much teal.** The sidebar's Check and publish stays teal beside each screen's own next action.
- **Placeholder text** uses the browser's grey, under 4.5:1 in light and worse in dark (5 inputs on 3 screens; axe does not test placeholders).
- **Native radios and checkboxes** show the browser's blue, and stay about 13px at 200% text.
- **Page titles** are 24px on some screens and 32px on others.
- **"You are here"** in the contents stays on a week while Check or Changes is open.
- **Tutors' own words** reach the default screens: Topic and Unit badges, a folder name on the quiz designer.
- **The helper** speaks on most screens, repeats its onboarding hint while the lecturer works, covers the editor's preview, and does not widen at 200% text.

## Per-screen top issues

- **Start:** the teal button says "Start a new course" while the helper says to try the sample first.
- **New course:** step 2 describes the reference course with a repository name.
- **Load a course:** only counts are shown, never which file goes into which week.
- **The course:** "Everything checks out" on a course with nothing written; the course home is eight stacked panels.
- **A week:** a hidden week shows no state, and Hide and Show again are both always enabled.
- **Writing a page:** Close throws unsaved text away without asking.
- **Quiz designer:** the eyebrow shows the folder name with Advanced mode off.
- **Changes:** undo wording ("Put back: hide …") is ambiguous, and entries don't link to their week.
- **Check and publish:** a finding with no automatic fix gets no way to fix it there; "Ready to publish" can show no publish action.
- **Publish:** progress and results appear below every card, away from the button pressed.
- **Settings:** controls stay small at 200% text; no `h1`.
- **The term:** hidden and due states show only in the term panel, not on the weeks themselves.

## Acted on

| Finding                                                                                                 | Change                                                                                                                                | Spec     |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Close throws unsaved words away                                                                         | Both editors ask first: Save first, Close without saving, or Keep writing                                                             | STU-0216 |
| "Everything checks out" on an empty course, and teal on Check and publish beside other screens' actions | The line under the title counts weeks still to write; Check and publish leads only once a week is written and no other screen is open | STU-0215 |
| The quiz designer shows a folder name                                                                   | It names the week by its title, in the eyebrow, the plan and the heading's example                                                    | STU-0217 |
| A hidden week shows no state                                                                            | Its page says "Hidden from students" and offers only "Show to students again"                                                         | STU-0218 |
| The helper speaks over other screens and runs one word per line at 200%                                 | It puts its words away when Settings, an editor, the quiz designer, Check or Changes opens, and its card grows with the text          | STU-0219 |
| "You are here" stays on a week while Check or Changes is open                                           | Nothing in the contents is marked while they are open                                                                                 |          |
| Placeholder contrast; blue, fixed-size radios and checkboxes                                            | Placeholders in the muted ink; radios and checkboxes in the ink, sized with the text                                                  |          |
| Settings has no `h1`                                                                                    | Its title is the page's `h1`                                                                                                          |          |

## Still to do

- Moving to another screen from the contents while an editor has unsaved words doesn't ask yet; only Close and Edit the markdown do.
- The course home holds eight panels; group Course details, Outcomes, Card picture and next year under one.
- A week lists its units, not what is in them.
- New course: describe the reference course without its repository name.
- Load a course: show which file goes into which week.
- Check and publish: give every finding a way forward, and a publish action beside "Ready to publish".
- Publish: show progress and results beside the button pressed.
- The term: show hidden and due states on the weeks and in the contents.
- Page titles: one size on every screen.
