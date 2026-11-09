# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(A Tauri 2 desktop window on Windows, macOS and Linux; the interface is web technology and uses one design language on every OS.)

## Users

**Primary: lecturers who know their subject and not the machinery.** They have slides, notes, labs and a term to plan. They do not know Git, markdown, or that a folder's name decides what students see, and they should not have to. They use Studio in bursts around teaching, usually on a laptop, often with a deadline.

**Secondary, by choice: the technically confident lecturer or learning technologist.** They turn on Advanced mode in Settings to reach the files themselves, including a markdown editor. Advanced mode adds tools; it never changes how the basics work.

## Product Purpose

Studio shows a lecturer their Tutors course the way Tutors will publish it, explains what is wrong in a lecturer's words, and fixes it through changes the lecturer has accepted. Success is a lecturer publishing a correct course without learning how Tutors works underneath.

## Positioning

Studio runs the same rules Tutors itself uses (`@tutors/course-rules`), so what it says about a course is what will happen to that course. Nothing changes in a course until the lecturer has seen the plan and accepted it.

## Operating Context

The course is a folder on the lecturer's computer. Material arrives as files dropped in. Publishing goes through Netlify or a push from the computer's own git. Lecturers may have dyslexia or low vision; Settings covers both.

## Capabilities and Constraints

- Course checking, renames and safe fixes, guided course creation, dropped material, quiz designer, slide and diagram previews, preview and publish, Git hand-off.
- **Plan, then apply:** nothing writes to a course except an accepted plan (ADR 0004). This holds for the assistant and for the markdown editor.
- **The rules own the words:** sentences about a finding come from `@tutors/course-rules`.
- **The assistant is optional.** Studio works fully with no AI chosen. Hosted models need a key in the keychain and read permission for each course (ADR 0006, 0016, 0022). Provider wiring is separate work (PR #12).
- **Terms:** say week or topic, page, lab, talk and "what students see". Say folder, file, markdown, `.env` or commit only in Advanced mode.

## Brand Commitments

Tutors Paper is the shared visual language with the student reader, and it stays. Teal marks the single next action on a screen. The assistant is an original character inspired by the idea of Office's old helper; it does not reuse that character, its name or its art.

## Evidence on Hand

A sample course in memory (`src/adapters/fs/memory/sample-course.ts`). There are no lecturer studies, quotes or usage figures yet, and none should be invented.

## Product Principles

1. **Speak teaching, not file system.** The default screens describe weeks, pages and what students see.
2. **One next thing.** A lecturer should always be able to tell what to do next.
3. **Help that waits its turn.** The assistant speaks at defined moments, never while someone is working, and goes away in one click. Asking it is always available.
4. **Nothing happens behind your back.** Every change, from a person or a model, is a plan the lecturer accepts.
5. **Depth is opt-in.** Advanced tools are one switch away and invisible until then.

## Accessibility & Inclusion

WCAG 2.1 AA in both appearances; dyslexia mode, text size up to 200%, high contrast and reduced motion apply to every screen, including the assistant and the editor. The assistant must be fully usable by keyboard and screen reader, and static under reduced motion.
