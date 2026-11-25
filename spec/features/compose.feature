Feature: Composing a course from the library
  As a lecturer who already has good labs and lectures in other courses
  I want to pick weeks and items from my library into a new course
  So that I start from material I trust, knowing it is a copy

  Scenarios drive the headless `compose` command over a library folder on disk, through the same use case the
  Library screen's "Make a course from these" calls. The library folder is only ever read.

  Background:
    Given a library folder holding a new course "Web Development" at "web-dev"

  @stu-0266 @ears-event
  Rule: When a lecturer composes a course from their library, the Studio shall show one plan that copies each week and item they picked into the week they chose, numbered as Tutors reads it, and write nothing until they accept it.

    Scenario: A whole week and a lab from another week, into the same week
      When the lecturer composes "Mixed" over 2 weeks from "web-dev:unit-1/topic-01@1" and "web-dev:unit-1/topic-02/lab-01@1"
      Then the command shall print "Plan: Create Mixed: 2 weeks, with 2 items copied from 1 course."
      And the new course shall hold "unit-1/topic-01/lab-01/00.Setup.md" and "unit-1/topic-01/lab-02/00.Setup.md"
      And week 1 shall be called "Week 1"
      And the new course shall check with no errors
      And the library folder shall be as it was

  @stu-0267 @ears-ubiquitous
  Rule: The Studio shall say, in every plan that composes a course, that it copies what was picked and that the copy and the original change separately.

    Scenario: The plan says it is a copy
      When the lecturer composes "Mixed" over 2 weeks from "web-dev:unit-1/topic-01/talk-01@2" and "web-dev:side/note-01@0"
      Then the command shall also print a line starting "Studio copies each item into your new course."

  @stu-0268 @ears-ubiquitous
  Rule: The Studio shall record, for every item it copies from the library, the folder, course and path it came from and a digest of its files, in a file Tutors does not publish.

    Scenario: Where a lecture came from
      When the lecturer composes "Mixed" over 2 weeks from "web-dev:unit-1/topic-01/talk-01@2" and "web-dev:side/note-01@0"
      Then the sources file shall say "unit-1/topic-02/talk-01" came from "unit-1/topic-01/talk-01" in "web-dev" with a SHA-256 digest

  @stu-0269 @ears-event
  Rule: When a lecturer composes a course, the Studio shall add a page to the module's own unit that lists each copied item and the course it came from.

    Scenario: The Borrowed material page
      When the lecturer composes "Mixed" over 2 weeks from "web-dev:unit-1/topic-01/talk-01@2" and "web-dev:side/note-01@0"
      Then the module's unit shall hold a page "Borrowed material" listing "Week 1 lecture" from "Web Development"

  @stu-0270 @ears-unwanted
  Rule: If a lecturer picks something from a course that needs fixing, then the Studio shall copy nothing and say the course needs fixing first.

    Scenario: A course with a problem
      Given the course at "web-dev" has lost "unit-1/topic-01/topic.md"
      When the lecturer composes "Mixed" over 2 weeks from "web-dev:unit-1/topic-02/lab-01@1" and "web-dev:side/note-01@0"
      Then the command shall print "Web Development needs fixing before anything can be borrowed from it."
      And no course shall have been made
