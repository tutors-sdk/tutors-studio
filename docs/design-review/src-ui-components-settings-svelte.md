---
target: settings screen
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/home/user/tutors-studio/src/ui/components/Settings.svelte"
target_fingerprint: "sha256:231772ab4a0d277fde6773cf04e0c969ac2d1cd05ed095c7089790485a4fb0ca"
target_path: /home/user/tutors-studio/src/ui/components/Settings.svelte
timestamp: 2026-11-19T04-27-49Z
slug: src-ui-components-settings-svelte
---

Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent), 2026-11-19, browser preview at 1280x800

# 11. Settings — src/ui/components/Settings.svelte (with Updates.svelte, Accounts.svelte)

Seen in browser: yes — light, dark, and Text size 200%; toggled Advanced mode.

## Design specificity verdict

Specific where it counts: Dyslexia mode explained against the British Dyslexia Association guide, contrast and reduced motion, the helper described in its own terms, the assistant choice with honest cost/privacy notes, usage counts that say what is not collected. Visually it's a standard settings stack of panels; the Updates block falls out of the design system (unstyled native select and small checkbox).

## Nielsen heuristics

| #   | Heuristic                       | Score     | Key issue                                                                                                                                   |
| --- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3         | Changes apply live (theme, size)                                                                                                            |
| 2   | Match with real world           | 3         | Plain, honest copy; "API key from the Claude Console" is necessary                                                                          |
| 3   | User control and freedom        | 3         | Done returns; everything reversible                                                                                                         |
| 4   | Consistency and standards       | 2         | Updates' native select/checkbox; Text size as a select where DESIGN uses segmented switches; Settings replaces the whole shell (no sidebar) |
| 5   | Error prevention                | 3         | Low risk                                                                                                                                    |
| 6   | Recognition rather than recall  | 3         | Grouped by need (Appearance, Reading, Vision…)                                                                                              |
| 7   | Flexibility and efficiency      | 3         | Ctrl/⌘ +/−/0 for text size from anywhere                                                                                                    |
| 8   | Aesthetic and minimalist design | 3         | Eight panels; Usage counts and Updates are lower-value for lecturers                                                                        |
| 9   | Error recognition and recovery  | 3         | n/a mostly; account errors in Accounts (source)                                                                                             |
| 10  | Help and documentation          | 3         | Every option explained in one or two sentences                                                                                              |
|     | **Total**                       | **29/40** | **Good**                                                                                                                                    |

## Cognitive load

- Failures: Chunking (8 groups in one scroll), Single focus (helper bubble with an unrelated message).
- Decision points >4: Text size (5 values), fine as a scale.
- Load: low-moderate (2).

## Emotional journey

Reassuring for the lecturer with dyslexia or low vision — the right options are near the top. The bump: at 200% the very controls a low-vision user just enabled (radios, checkboxes) stay tiny, and the helper bubble becomes a one-word-per-line column covering the right side.

## What's working

1. Accessibility settings are first-class and explained ("Makes text and controls bigger together").
2. Privacy copy for usage counts and the assistant is precise and specific.
3. Radios use `accent-color: var(--ui-brand)` — the only form in the app that does.

## Priority issues

- **[P1] Native radios and checkboxes don't scale at 200%.** What: seen at Text size 200%: "Match this computer / Light / Dark" radios and "Dyslexia mode" checkbox remain ~13px while labels double. Why: low-vision users (PRODUCT Accessibility) get small targets on the screen built for them. Fix: in paper-tokens.css or Settings.svelte, size `input[type=radio|checkbox]` with `width/height: calc(1.25em)` (em-based) app-wide. Suggested command: $impeccable adapt
- **[P2] Updates block is off-system.** What: "Versions" select is a square, small native select; the auto-update checkbox is smaller than others. Fix: apply the `.settings select` / checkbox styles in Updates.svelte (or share a field style). Suggested command: $impeccable polish
- **[P2] Settings drops the course context.** What: App.svelte renders Settings instead of the sidebar + main, so the lecturer loses their place; Done is the only way back. Fix: render Settings in the main column with the course sidebar kept, or as a dialog. Suggested command: $impeccable layout
- **[P2] Helper on Settings is off-topic and doesn't scale.** What: "Open a week, then drag a file…" (or "1 thing needs sorting out…") shown here; at 200% the bubble's width is fixed so text runs one word per line. Fix: suppress moments on Settings; size the bubble in `em`/`ch` (`max-width: 28ch`). Suggested command: $impeccable quieter
- **[P3] Text size as a select.** Fix: a 5-option segmented switch per DESIGN "Segmented switch", which also shows the current value at a glance. Suggested command: $impeccable polish

## Persona red flags

- **Sam:** see P1; Contrast radios read "Contrast: match this computer / Standard contrast / High contrast" — first label carries the group name, others don't (use a fieldset legend).
- **Jordan:** "Assistant: None / A model on this computer / Claude" — "model on this computer" means nothing without Ollama context.
- **Dana (deadline):** fine; quickly finds Advanced mode is not needed.

## Minor observations

- Heading "Settings" is 32px/H2 with no H1 on the page.
- Panels are left-aligned at ~770px, leaving ~480px empty on the right at 1280.
- Dark mode: correct tokens throughout.

## Questions to consider

- Should Reading and Vision be one "Comfort" group, put first, with a live sample paragraph?
- Could Updates and Usage counts move to an "About Studio" section?

## Deterministic scan and browser evidence (Assessment B)

### 11 Settings — src/ui/components/Settings.svelte

## CLI

exit 0, 0 findings.

## Browser overlay (sidebar → Settings): 3 findings

- straggler "ask." alone on last of 2 lines (4% of measure) — p.help "The paper note in the corner. It speaks up now and then..."
- line-length ~106 chars on 2 of 3 rendered lines — p.help "An assistant explains a course's problems in plainer words..."
- overused-font inter (body)

## axe

- light: page-has-heading-one (moderate, best-practice) ×1 — html: no level-one heading. Settings replaces the course view, and its title is not an h1 (other course screens keep the sidebar's h1 course name).
- dark: same, ×1.

## False positives

- overused-font (Inter, 100% of text): false positive for this project. DESIGN.md (front matter, lines 69-84) names Inter as the contract typeface; the rule flags a generic choice, but here it is the specified one.
- line-length / straggler / unbalanced-heading: real but minor typographic measurements from rendered lines at 1280px; they depend on viewport width and Studio text-size setting.
  page-has-heading-one is a real (best-practice, non-WCAG) gap: the only screen with no h1.

## Skipped

None.
