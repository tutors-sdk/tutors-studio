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

  @stu-0130 @ears-event
  Rule: When files in the open course change on disk, in Studio or another app, the Studio shall read the course again and show the change on the course map.

    Scenario: Slides saved from another app
      Given a course whose week 1 has a talk with no slides
      And the lecturer is watching the course map
      When another app saves "topic-01/talk-01/talk.pdf"
      Then the course map shall be read again once
      And the course shall have no errors

  @stu-0148 @ears-event
  Rule: When a lecturer forgets a course on the start screen, the Studio shall take it off the list and leave its folder and files as they are.

    Scenario: Forgetting a course
      Given the lecturer has opened "/courses/web-dev", "/courses/agile" and then "/courses/mobile"
      And the folder "/courses/agile" holds a course
      When the lecturer forgets "/courses/agile"
      Then the start screen shall list "mobile, web-dev"
      And the folder "/courses/agile" shall still hold every file it had

  @stu-0149 @ears-event
  Rule: When a lecturer puts back a course they have just forgotten, the Studio shall list it where it was.

    Scenario: Putting a forgotten course back
      Given the lecturer has opened "/courses/web-dev", "/courses/agile" and then "/courses/mobile"
      When the lecturer forgets "/courses/agile"
      And the lecturer puts it back
      Then the start screen shall list "mobile, agile, web-dev"
