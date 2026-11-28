# 0071. Guided building: uploads that name what an item takes, and a guide through a new course

**Status:** Accepted
**Date:** 2026-11-28
**Builds on:** [0004](0004-plan-then-apply.md), [0012](0012-shape-from-pattern-and-calendar.md), [0038](0038-drops-on-a-week-go-straight-in.md), [0040](0040-files-belong-to-what-shows-them.md)

## Context

Leigh, 2026-11-28: "I also want studio to do a more guided approach. When I add a talk for example it should give me an upload button for my PDF. When I'm in a lab or something similar again an upload content button. This way I'm hand holding them through it. I'd like a guided mode option when a lecturer chooses new course so it then takes them through each week and each step, this is a complement to the existing shape of the course. So they can manually play around or have a track to follow."

Until now a lecturer added material by dropping files on a week (ADR 0038): Studio made each file its own new item. A talk Studio had already made, with its starter Marp deck, had no way to take the lecturer's PDF in its place, and nothing on a lab said what it wanted. A new course opened on its map with every week ready and no order to fill it in.

## Decision

- **Each item asks for what its kind takes** (STU-0341). `uploadFor(kind)` in `src/domain/guided.ts` names the button and its file filter: a talk "Upload your slides (PDF)", a tutorial "Upload the problem sheet (PDF)", a lab "Upload your lab content", a note "Upload your reading", an archive "Upload the download (zip)". Weeks, links, quizzes and videos take none. The button sits at the top of the item's page, takes a drop too, and is teal when it is the next thing to do there.
- **An upload is a plan** (ADR 0004), `AuthoringPort.planUpload(item, files)`, shown in the same box as every other change and put back from Changes:
  - a talk or tutorial takes one PDF; the PDF or Marp deck it showed before goes to the bin (STU-0342), and anything else is refused with what to do instead (STU-0343);
  - a lab makes each Markdown page a step, in name order, after the lecturer's own steps or in place of steps still holding starter text, which go to the bin; every other file goes where ADR 0040 says, its links followed (STU-0344);
  - a note takes one Markdown page as the reading while it still holds starter text, keeping its card's icon, and attaches every other file in `archives/` with a link (STU-0345); it never writes over the lecturer's own writing (STU-0346);
  - an archive takes one file as its download, zipped when it is not a zip (STU-0347).
- **Guided mode is a choice on New course** (STU-0348): "Guide me, week by week" or "I'll find my own way", guided first for a lecturer with no courses yet. A course made in guided mode opens at the guide's first step. The course home offers the guide on any course later (STU-0352).
- **The guide is a track over the same course map**, not a second editor (STU-0349). For each week in reading order: name the week, then each item that takes material, in the order Tutors shows them; then check the course. The guide sits above the item's page, which carries the upload; the course map stays free to use.
- **The guide reads its progress from the course** (`AuthoringPort.guide()`), never from a record of its own. A week is done once its title is no longer Studio's "Week N"; an item once it holds the lecturer's material (a PDF or a changed deck, written steps, a written reading, a zip). After each change the guide moves on to the next step not done (STU-0350). Skipping leaves a step for the list still to do at the end (STU-0351). Leaving the guide keeps everything, and going back to it starts at the first step not done.

## Consequences

- No new port, adapter or setting: two methods on the authoring facade, a pure domain module, and a UI session class (`src/ui/guide-session.svelte.ts`).
- Because progress comes from the files, a course built partly by hand, in another app or before this change, picks up the guide at the right step.
- "Done" for a talk depends on the starter deck's sentence from tutors-create (`STARTER_DECK_LINE`). If tutors-create changes its starter deck, a talk still holding it counts as done until the line is updated.
