# 0012. Shape is derived from a pattern and the calendar, never configured

**Status:** Accepted
**Date:** 2026-11-08

## Context

The CLI asks twelve yes/no questions before a course exists. A lecturer new to Tutors should make three decisions.

## Decision

Studio's start asks three questions (name and lecturer; start date and teaching weeks; one of four teaching patterns) and generates the course through @tutors/tutors-create's generateCourseFiles with a pattern. After that the lecturer only drops content; the shape follows. The map and the calendar always agree.

## Consequences

The CLI's twelve prompts remain the expert path. Patterns are data in the monorepo (patterns/*.yaml), so the CLI and Studio generate the same course. The generator is reached through the CourseRulesPort (`patterns()`, `newCourseFiles()`), so only the rules adapter names a monorepo package. Creation is one plan of writes applied whole into a folder made fresh for it; an existing folder is never written into.

## Specified by

STU-0009, STU-0010, STU-0063, STU-0064, STU-0083, STU-0084 (STU-0008 and STU-0011 retired)

## Amended 2026-11-09

Leigh removed the dates question ("remove reading week full stop", "remove all of step 2") and the pattern cards ("Screen 3 feels like it limits us; ask smart questions about how a week is broken down"). New courses now take two questions: the name, then how a teaching week breaks down (how many weeks; lectures, labs and readings in a typical week; whether students build a project). A new course is undated: no `calendar.yaml` and no "Week of" line. The lecturer adds a calendar when they have dates. The generator is still tutors-create's pattern path. Studio picks `project-based` for a project and `lecture-lab` otherwise, for their side units, and always passes the lecturer's week. `CourseRulesPort.patterns()` is gone. STU-0008 and STU-0011 are retired; STU-0083 and STU-0084 replace them.
