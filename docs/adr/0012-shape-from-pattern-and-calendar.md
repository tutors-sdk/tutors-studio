# 0012. Shape is derived from a pattern and the calendar, never configured

**Status:** Accepted
**Date:** 2026-11-08

## Context

The CLI asks twelve yes/no questions before a course exists. A lecturer new to Tutors should make three decisions.

## Decision

Studio's start asks three questions (name and lecturer; start date and teaching weeks; one of four teaching patterns) and generates the course through @tutors/tutors-create's generateCourseFiles with a pattern. After that the lecturer only drops content; the shape follows. The map and the calendar always agree.

## Consequences

The CLI's twelve prompts remain the expert path. Patterns are data in the monorepo (patterns/*.yaml), so the CLI and Studio generate the same course.

## Specified by

(rules land with guided creation)
