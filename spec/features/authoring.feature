Feature: Authoring a course in Studio
  As a lecturer who is not a developer
  I want to see my course the way Tutors will read it, and fix it in a click
  So that nothing I made goes missing when I publish

  Scenarios drive the headless adapter over a course held in memory, through the same AuthoringPort the
  app's window uses.

  @stu-0001 @ears-ubiquitous
  Rule: The Studio shall change a course only by applying a plan the lecturer has accepted.

    Scenario: Asking for a fix changes nothing until the plan is applied
      Given a course with a folder named "Week 3"
      When the lecturer asks for the fix to "Week 3"
      Then the plan shall read "Rename Week 3 to topic-week-3"
      And the course shall be unchanged
      When the lecturer accepts the plan
      Then the course shall hold "topic-week-3/topic.md"

  @stu-0002 @ears-event
  Rule: When a lecturer opens a course folder, the Studio shall show every folder with the kind Tutors reads it as, and mark each folder Tutors would leave out as won't be published.

    Scenario: A course with a week Tutors would drop
      Given a course with a folder named "Week 3"
      When the lecturer opens the course
      Then the map shall show "topic-01" as "Topic"
      And the map shall show "topic-01/talk-01" as "Talk"
      And the map shall mark "Week 3" as won't be published

  @stu-0003 @ears-event
  Rule: When a lecturer accepts the rename a finding suggests, the Studio shall move the folder with everything in it and show the course checked again without that finding.

    Scenario: Renaming Week 3 clears its badge
      Given a course with a folder named "Week 3"
      When the lecturer opens the course
      And the lecturer accepts the fix to "Week 3"
      Then the course shall hold "topic-week-3/talk-01/slides.pdf"
      And the map shall show "topic-week-3" as "Topic"
      And there shall be no findings

  @stu-0004 @ears-unwanted
  Rule: If applying a plan fails part-way, then the Studio shall undo every change the plan made and name the file that blocked it.

    Scenario: A locked file stops a two-step plan
      Given a course with a folder named "Week 3"
      And the file "notes.md" cannot be written
      When the lecturer applies a plan that renames "Week 3" and then writes "notes.md"
      Then the result shall name "notes.md" as the blocker
      And the course shall be unchanged

  @stu-0005 @ears-state
  Rule: While no assistant is chosen, the Studio shall explain a finding with the rule's own message.

    @active
    Scenario: No assistant, so the rule explains itself
      Given a course with a folder named "Week 3"
      And no assistant is chosen
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be the rule's own message

    @inactive
    Scenario: A chosen assistant explains in its own words
      Given a course with a folder named "Week 3"
      And an assistant is chosen that says "Rename it so Tutors can see it."
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be "Rename it so Tutors can see it."

  @stu-0006 @ears-unwanted
  Rule: If a plan names a path outside the course folder, then the Studio shall refuse the whole plan before changing anything.

    Scenario: A plan that reaches out of the course
      Given a course with a folder named "Week 3"
      When the lecturer applies a plan that renames "Week 3" and then writes "../outside.md"
      Then the result shall name "../outside.md" as the blocker
      And the course shall be unchanged

  @stu-0007 @ears-ubiquitous
  Rule: The Studio shall describe every finding in the words @tutors/course-rules gives it.

    Scenario: The headless check prints the rules' own sentences
      Given a course with a folder named "Week 3"
      When the lecturer checks the course from the command line
      Then every finding line shall end with the message @tutors/course-rules gave it
      And the last line shall read "1 problem to fix before publishing."
      And the exit code shall be 1
