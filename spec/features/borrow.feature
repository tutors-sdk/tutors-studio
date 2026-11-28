Feature: Adding library material to a course I have
  As a lecturer with a course already under way
  I want to copy a unit, a week or a lab from my library straight into it
  So that I reuse material I trust without starting a new course

  Scenarios drive the headless `borrow` command over a library folder and a course folder on disk, through the
  same use case the Library screen calls while a course is open. The library folder is only ever read.

  Background:
    Given a library folder holding a new course "Web Development" at "web-dev"
    And a course of my own, "Mobile", with 2 weeks

  @stu-0332 @ears-state
  Rule: While a course is open, the Studio shall let the lecturer pick units, weeks and items from ready library courses and choose where each goes in that course: a new week or unit at its end, a unit's next week, a week, or the module's own unit.

    Scenario: Where a week can go, and where a lab can go
      Then a week can go in "A new week at the end of the course", "Weeks 1–2, as its next week", "Weeks 1–2: Week 1" and "Weeks 1–2: Week 2"
      And a lab can go in "Weeks 1–2: Week 1", "Weeks 1–2: Week 2" and the module's own unit
      And a unit can go only in "A new unit at the end of the course"

  @stu-0333 @ears-event
  Rule: When the lecturer adds library picks to an open course, the Studio shall show one plan that copies each into the course's folder under the next free number of its kind, saying that it copies, and write nothing until the lecturer accepts it.

    Scenario: A week as the unit's next week, and a lab into week 1
      When the lecturer borrows "web-dev:unit-1/topic-02@unit-1" and "web-dev:unit-1/topic-01/lab-01@unit-1/topic-01" into "Mobile"
      Then the command shall print "Plan: Copy 2 items copied from 1 course into this course."
      And the command shall also print a line starting "Studio copies each item into this course's folder."
      And "Mobile" shall hold "unit-1/topic-03/lab-01/00.Setup.md" and "unit-1/topic-01/lab-02/00.Setup.md"
      And "Mobile" shall check with no errors
      And the library folder shall be as it was

    Scenario: A whole unit at the end of the course
      When the lecturer borrows "web-dev:unit-1@end" and "web-dev:side/note-01@side" into "Mobile"
      Then "Mobile" shall hold "unit-02/topic-01/topic.md" and "side/note-02/note.md"
      And "Mobile" shall check with no errors

  @stu-0334 @ears-event
  Rule: When the Studio copies library picks into a course, the Studio shall add each to the course's record of where its copies came from and write its Borrowed material page again, keeping what was borrowed before.

    Scenario: Borrowing twice
      When the lecturer borrows "web-dev:unit-1/topic-01/talk-01@unit-1/topic-01" and "web-dev:unit-1/topic-02@end" into "Mobile"
      And the lecturer borrows "web-dev:unit-1/topic-02/lab-01@unit-1/topic-02" and "web-dev:side/note-01@side" into "Mobile"
      Then the sources file of "Mobile" shall list 4 copies
      And "Mobile" shall have one Borrowed material page, listing "Week 1 lecture" and "Week 2 lab"
