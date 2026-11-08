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

STU-0008, STU-0009, STU-0010, STU-0011
