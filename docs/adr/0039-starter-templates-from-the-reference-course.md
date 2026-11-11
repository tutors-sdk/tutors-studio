# 0039. Starter templates from the reference course

**Status:** Accepted
**Date:** 2026-11-11
**Builds on:** [0012](0012-shape-from-pattern-and-calendar.md)

## Context

The guided New course questions (STU-0063, STU-0083) shape every week the same way from three counts. Leigh asked (2026-11-11) for the Tutors reference course (tutors-sdk/tutors-reference-course) to become a base: templates a lecturer can start from for a 2, 4, 6, 8, 10 or 12 week course, in different kinds of module, as a solid bootstrap beside the guided approach.

The reference course is a showcase of every learning object, not a course to copy: its pages are demonstrations, and some of it fails `tutors validate` (a stray talk.md in a lab). What carries over is its shapes: a typical week of talks, a lab and supporting resources (Typical), labs beside the weeks (Sidebar), a note or talk as the week's own page (Panel Note, Panel Talk), and archives and quizzes (Reference).

## Decision

- Five templates, as data in `src/domain/templates.ts`: Lecture and lab (Typical), Practical-led (Sidebar), Seminar and reading (Panel Note), Watch first, then practise (Panel Talk), and Project-based (Reference). Each names the reference topic it follows, what every week holds and what sits beside the weeks. STU-0148.
- Each comes in 2, 4, 6, 8, 10 and 12 weeks. The length is more than a count: weeks fall into one section up to four weeks, two up to ten and three for twelve, and from six weeks the last week is a review with a quiz. STU-0149, STU-0150.
- A template is one more answer to the New course questions (`CourseAnswers.template`), so it goes through the same plan, `applyPlan` and folder guard as the guided course (ADR 0004, STU-0010). The rules adapter writes the root files with tutors-create's `courseRootFiles` and the quiz with course-rules' `writeQuizPage`; the domain writes the weeks. No port changes, nothing in `vendor/` changes.
- Every page a template writes holds a sentence to write over; Studio counts those pages as not written yet (STU-0086, STU-0152), alongside tutors-create's starter text.
- No web links, GitHub links or videos in a template: each needs an address only the lecturer has, and a placeholder address would reach students. The lecturer adds them by name (STU-0059).
- `headless templates` lists them; `headless new --template <id> --weeks N` makes one.

## Consequences

- Every template at every length checks with no findings at all, and the scenario for STU-0149 proves all thirty on each run.
- A new template is a new entry in `courseTemplates`; a new length is a new entry in `TEMPLATE_LENGTHS`. Both are covered by the same scenario.
- If tutors-create gains templates upstream, this data moves there and Studio reads it through the rules adapter, as it does patterns.
