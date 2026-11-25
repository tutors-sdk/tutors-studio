---
target: library screen
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 0
target_identity: "file:src/ui/components/Library.svelte"
target_path: src/ui/components/Library.svelte
timestamp: 2026-11-25T07-20-00Z
slug: src-ui-components-library-svelte
---

Method: single reviewer against DESIGN.md, 2026-11-25, browser preview at 1280x860 (light), with the preview library (the sample course, which has a problem, beside Web Development II made fresh).

# Library — src/ui/components/Library.svelte

Seen in browser: yes. Start screen, **Your library**.

## Design specificity verdict

Specific. The screen answers the lecturer's two questions in order: what is in my folders, and can I use it yet. The promise "never changes a file there" is in the first sentence, where the worry starts.

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                           |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3         | "Looking for courses…" while it checks; counts in each heading      |
| 2   | Match with real world           | 3         | Courses, items, problems; no file words                             |
| 3   | User control and freedom        | 3         | Take out a folder; Back                                             |
| 4   | Consistency and standards       | 3         | Same panel, type scale and buttons as the start screen              |
| 5   | Error prevention                | 3         | Courses that need fixing lend nothing, and say so                   |
| 6   | Recognition rather than recall  | 3         | Course title first, folder second                                   |
| 7   | Flexibility and efficiency      | 2         | No search or filter yet; fine for a few dozen courses               |
| 8   | Aesthetic and minimalist design | 3         | One teal button only when the library is empty                      |
| 9   | Error recognition and recovery  | 3         | An unreadable folder is named with why; Open goes straight to Check |
| 10  | Help and documentation          | 3         | Guide 14                                                            |
|     | **Total**                       | **29/40** | **Good**                                                            |

## Acted on

- The panel first rendered in the sidebar column; it now spans the window like the start screen.
- The preview library first held only the sample course, which needs fixing; it now shows one course of each kind.

## Left for later

- Search and a filter by kind across courses: a long course makes a long pick list (capped at 320px, scrolling).
- Composing (R1) added Pick from it and Your new course below the lists; they fit the same panel and type scale.
- Sharing (R2, `Share.svelte`) opens under the course it shares from, like Pick from it, so the lecturer never loses which course it is. Its one teal button is See the plan, then Share; the licence field explains why it is required in the hint under it. Registry entries show their version and licence where a course shows its warnings, and have no Open or Share.
