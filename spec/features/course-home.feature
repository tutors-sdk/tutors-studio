Feature: The course home and recent courses
  As a lecturer coming back to a course I work on every week
  I want Studio to open where I left off and show how far along each week is
  So that I go straight to the week that needs me

  Scenarios drive the recent-courses use case over settings held in memory, and the AuthoringPort's week
  states over a course held in memory.

  @stu-0127 @ears-event
  Rule: When a lecturer opens or makes a course, the Studio shall put it first among the start screen's courses, each course once and at most eight.

    Scenario: Opening a course again
      Given the lecturer has opened "/courses/web-dev" and then "/courses/mobile"
      When the lecturer opens "/courses/web-dev" again
      Then the start screen shall list "web-dev, mobile"

    Scenario: Ten courses
      Given the lecturer has opened ten courses
      Then the start screen shall list 8 courses, the newest first

  @stu-0128 @ears-event
  Rule: When Studio starts, the Studio shall reopen the course open last, or, if its folder has gone, drop it from the list and say so.

    Scenario: The last course is reopened
      Given the lecturer has opened "/courses/web-dev" and then "/courses/mobile"
      Then Studio shall reopen "/courses/mobile" when it starts

    Scenario: A course whose folder has gone
      Given the lecturer has opened "/courses/web-dev" and then "/courses/mobile"
      When the folder "/courses/mobile" has gone
      Then the start screen shall list "web-dev"

  @stu-0129 @ears-ubiquitous
  Rule: The Studio shall show each week on the course home as needing sorting out, empty so far, still to write, or written.

    Scenario: Four weeks in four states
      Given a course whose week 1 is written, week 2 still holds starter text, week 3 is empty and week 4 has a talk with no slides
      When the lecturer opens the course home
      Then the weeks shall show as "Written, Still to write, Empty so far, Needs sorting out"
