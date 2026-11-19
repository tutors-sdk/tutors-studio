---
target: page editor screen
total_score: 21
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/tutors-studio/src/ui/components/PageEditor.svelte"
target_fingerprint: "sha256:9bb7fe14b3df519d1a29e63363c453e199097915c6c2df68ab481744f6ceb956"
target_path: /home/user/tutors-studio/src/ui/components/PageEditor.svelte
timestamp: 2026-11-19T04-27-48Z
slug: src-ui-components-pageeditor-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 6. Page editor — src/ui/components/PageEditor.svelte (and PlainEditor.svelte, which "Write" opens)

Seen in browser: yes — "Write" (PlainEditor, word-processor style) on a lab and the course page, and in Advanced mode "Edit the markdown" (PageEditor, source + preview), typed, saved to the plan, and tested Close with unsaved text.

## Design specificity verdict

The plan bar ("Before anything changes — Save your changes to …. Nothing else is touched. [Make this change] [Keep editing]") is specific and on-brand. The editors themselves are generic: a row of text buttons over a white box (Write), or a CodeMirror/preview split (Edit). The preview does not look like the Tutors reader page it claims to preview.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                                  |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Visibility of system status     | 2         | "Saved on your computer" shows before any edit; no dirty indicator in PageEditor besides Save enabling                                     |
| 2   | Match with real world           | 2         | PageEditor heading "Edit page" over a full path `topic-02-…/00.Lab-02-JS-Arrays.md` (acceptable in Advanced); preview renders front matter |
| 3   | User control and freedom        | 1         | Close discards typed text with no warning (tested: typed text gone on reopen)                                                              |
| 4   | Consistency and standards       | 2         | Teal Save and teal Check and publish on screen together; toolbar buttons look like plain text                                              |
| 5   | Error prevention                | 1         | Same as 3; navigating via the sidebar also drops edits                                                                                     |
| 6   | Recognition rather than recall  | 3         | Labelled toolbar, not icons                                                                                                                |
| 7   | Flexibility and efficiency      | 3         | Ctrl/⌘-S plans a save in PageEditor                                                                                                        |
| 8   | Aesthetic and minimalist design | 3         | Focused, calm                                                                                                                              |
| 9   | Error recognition and recovery  | 2         | `problem` line exists; no recovery for lost text                                                                                           |
| 10  | Help and documentation          | 2         | Subtitle "Write the way you would in a word processor" good; helper talks about dragging files while you write                             |
|     | **Total**                       | **21/40** | **Acceptable**                                                                                                                             |

## Cognitive load

- Failures: Single focus (helper bubble over the preview), Minimal choices (PlainEditor toolbar has 14 buttons in two rows: Heading … Attach a file), Visual hierarchy (two teal buttons).
- Decision points >4: PlainEditor toolbar (14), PageEditor toolbar (7).
- Load: moderate (3).

## Emotional journey

Writing feels safe until the lecturer presses Close and loses the paragraph — the worst possible end for a deadline user. The save plan is a peak of trust ("Nothing else is touched"), but "Saved on your computer" before anything is saved blurs what "saved" means.

## What's working

1. Save goes through the same "Before anything changes" plan as everything else; while it shows, "Make this change" is the teal action and Save goes quiet.
2. Toolbar labels are words, not icons — right for this audience.
3. PlainEditor hides markdown entirely for non-Advanced lecturers.

## Priority issues

- **[P1] Unsaved writing is discarded silently.** What: PageEditor/PlainEditor `Close` calls `onClose` directly; App.svelte sets `pane = null`. Reproduced: typed " IMPORTANT NEW TEXT", Close, reopen — gone; no prompt. Why: data loss for the primary user, contradicting "nothing happens behind your back". Fix: when `dirty`, turn Close into the plan ("You have unsaved changes: Save them / Discard / Keep editing"), and guard sidebar navigation in App.svelte `selectNode` the same way. Suggested command: $impeccable harden
- **[P1] Preview shows front matter as page content.** What: PageEditor preview renders an `<hr>` and a heading "icon: type: fluent-color:wrench-screwdriver-24" above "Lab 02 JS Arrays". Why: the preview misrepresents what students see — Studio's core promise. Fix: strip YAML front matter in `course.authoring.renderPage` before markdown-it (or render it as a muted "Page settings" chip). Suggested command: $impeccable harden
- **[P2] Helper overlaps the editor and speaks while writing.** What: bubble "Open a week, then drag a file…" covers the lower right of the preview pane. Fix: Companion should hold its bubble while `editing`/`writing` is set (App.svelte already knows). Suggested command: $impeccable quieter
- **[P2] Two teal actions.** What: Save (`.primary`) plus sidebar "Check and publish" (`.next`). Fix: CourseSidebar should drop `next` while an editor or plan is open. Suggested command: $impeccable polish
- **[P3] Toolbar buttons have no visible button affordance** (borderless text at rest) and wrap to two rows at 1280px in PlainEditor. Fix: group (Text | Lists | Insert) with hairline separators; move Maths/Diagram/Table under "Insert". Suggested command: $impeccable layout

## Persona red flags

- **Jordan:** "Saved on your computer" + disabled Save reads as "it saves automatically" — then Close loses their work.
- **Sam:** the CodeMirror source has an aria-label with the file path; preview has `aria-label="Preview"` but no live region; the 3px teal focus frame on the source is clear.
- **Alex:** Ctrl-S works in PageEditor; no shortcut for Make this change (Enter) once the plan is open.
- **Dana (deadline):** writes a lab intro, clicks Close believing it saved. Lost.

## Minor observations

- PageEditor title "Edit page" ignores the page's own title; PlainEditor uses it ("Lab 02 JS Arrays") — prefer the title in both.
- Plan copy repeats the full path in non-wrapping mono text — fine in Advanced, long.
- Preview pane is not the reading-panel (88ch, 18px/1.65) DESIGN describes.

## Questions to consider

- Should Studio keep a draft of unsaved text per page, so Close is never destructive?
- What if the preview were the actual Tutors reading panel styles, so "what students see" is literal?

## Deterministic scan and browser evidence (Assessment B)

### 6 Page editor — src/ui/components/PageEditor.svelte

## CLI

exit 0, 0 findings.

## Browser overlay (week 1 → Write): 1 finding

- overused-font inter (body)

## axe

axe-core 4.x (repo node_modules), resultTypes violations, 1280x800: light 0 violations; dark (colorScheme 'dark') 0 violations.

## False positives

- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.

## Skipped

None. Note: "Write" opened the plain (word-processor) editor; the markdown editor is Advanced-mode only and was not toggled.
