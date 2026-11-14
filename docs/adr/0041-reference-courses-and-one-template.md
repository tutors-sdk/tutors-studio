# 0041. Reference courses and one template

**Status:** Accepted
**Date:** 2026-11-14
**Amends:** [0039](0039-starter-templates-from-the-reference-course.md)

## Context

ADR 0039 gave New course five templates (Lecture and lab, Practical-led, Seminar and reading, Watch first then practise, Project-based) beside the guided week. Leigh (2026-11-14) found that too many options, and a mismatch with the example courses Studio is checked against: "we should have reference courses in a drop down and 2 other template types not the variety and mismatch we have". He also asked for the example courses to become named templates "that we know 100% work with our Studio".

Those example courses are real Tutors modules: edeleastar/module-web-dev-2-2022, module-mobile-app-dev-oth and module-agile-soft-dev-2013, the Tutors reference course, and jouwdan/lc-cs.

## Decision

- New course offers three ways to start (STU-0162, retiring STU-0150):
  1. **A reference course**, picked from a list. This is the default.
  2. **Lecture and lab**, the one template kept from 0039, in 2 to 12 weeks.
  3. **Shape my own week**, the guided questions (STU-0063).
- A reference course is data in `src/domain/example-courses-data.ts`: every week, unit, item and lab step of the course, by title, read from each repository at a named commit. `exampleFiles` turns one into a course's files (STU-0163). It is one more answer to the New course questions (`CourseAnswers.example`), so it goes through the same plan and `applyPlan` as the other two (ADR 0004).
- Only the shape and titles are copied. Every page holds Studio's starter text, so the new course shows every week as still to write (STU-0154). The edeleastar and lc-cs repositories carry no licence, so no page content, slide or PDF is copied.
- Web links keep their address, because the address is the item. Book folders become labs and reference folders become notes. Panel videos, GitHub cards and folders Tutors gives no kind are left out: each needs an address only the lecturer has (as in 0039).
- `headless templates` lists the template and each reference course. `headless new --example <id>` makes one.

## Verification

Each reference course was made with Studio and then:

- checked with `headless check`, with no findings;
- built with the real Tutors generator (`jsr:@tutors/tutors@5.3.0`). The card count of every kind in its `tutors.json` matched the reference data exactly.

The scenarios for STU-0163 repeat the check and compare every week, unit, item and lab step by title on each run.

## Consequences

- A new reference course is a new entry in the data file, read from its repository. The header lists the source commits.
- The four retired templates are gone from the code. A lecturer who wants that shape starts from **Shape my own week**.
