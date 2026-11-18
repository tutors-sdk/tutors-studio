# 0049. Running the term

**Status:** Accepted
**Date:** 2026-11-18

## Context

The design doc's term work (T1) asks Studio to help a lecturer through the year, not only while they build a course: which teaching week it is, weeks kept from students until a day, and next year's course started from this one. Tutors hides a week or unit only at the top of a course, through the `ignore` list in `properties.yaml`, and it has no release dates. A hidden week appears only when the course is published again.

## Decision

- **A release date lives beside the ignore list.** `properties.yaml` gains a `release:` block with one `<folder>: YYYY-MM-DD` line for each dated week. Tutors ignores keys it doesn't know, so the course publishes as before. Giving a week a date hides it as well; the plan is one write to `properties.yaml`, composed from course-rules' own hide (STU-0197).
- **Nothing is released on its own.** Studio has no server and the course reaches students only when it is published, so a due week is a reminder on the course home with one press: **Show … to students** gives the plan that takes it off the ignore list, and publishing is the next step (STU-0198). Studio never changes a course because a date passed.
- **The term view comes first on the course home** while the course has a calendar: the teaching week from the calendar's first day, what is hidden and when it is due, and any due week as the screen's single next action (STU-0196).
- **Roll over makes a new course folder and leaves this one alone** (STU-0199). The plan copies every file but built output, the bin, git and the computer's own files, clears the release dates, retitles `course.md` and writes a calendar from the Monday of the week the lecturer gives. It is applied whole to a new folder through the same `makeFolder` as a new course, so nothing in the source course changes and the outcomes and their tags travel with the content.
- **A pure `term` module in `src/domain`, and no new port.** The use cases sit beside course details in authoring; roll over sits beside new course. The headless adapter gains `term`, `release`, `show-due` and `roll-over`.

## Consequences

- A lecturer who wants a week out on a day still publishes on that day. Releasing without a press needs a server Studio doesn't have; if Tutors ever reads `release:` itself, the reminder can go.
- Only top-level weeks and units take a release date, because only they can be hidden in Tutors.
