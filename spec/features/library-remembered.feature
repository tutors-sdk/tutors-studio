Feature: The library, remembered
  As a lecturer who has already added my library folders
  I want Studio to show what it found last time when I go back to the library
  So that I don't wait for it to look through every folder again

  Scenarios drive the library the Library screen calls, over temporary folders on disk and settings in memory,
  counting each time Studio looks in a folder.

  Background:
    Given library folders "first" and "second", each holding a new course

  @stu-0328 @ears-event
  Rule: When the lecturer opens the library, the Studio shall show the courses it found when it last looked, without looking again, and say when it last looked.

    Scenario: Back to the library
      Given the Studio looked through the library at "2026-11-28T16:40:00.000Z"
      When the lecturer opens the library again
      Then it shall list 2 courses
      And it shall say it last looked at "2026-11-28T16:40:00.000Z"
      And it shall not have looked in any folder again

  @stu-0329 @ears-event
  Rule: When the lecturer adds a library folder, the Studio shall look only in that folder and keep what it found in the others.

    Scenario: A third folder
      Given the Studio looked through the library at "2026-11-28T16:40:00.000Z"
      When the lecturer adds a library folder "third" holding a new course
      Then it shall have looked only in "third"
      And it shall list 3 courses

  @stu-0330 @ears-event
  Rule: When the lecturer takes a folder out of the library, the Studio shall drop what it found there without looking again.

    Scenario: Taking a folder out
      Given the Studio looked through the library at "2026-11-28T16:40:00.000Z"
      When the lecturer takes "second" out of the library
      Then it shall list 1 course
      And it shall not have looked in any folder again

  @stu-0331 @ears-event
  Rule: When the lecturer asks the Studio to look again, the Studio shall look through every library folder and remember what it finds.

    Scenario: Look again
      Given the Studio looked through the library at "2026-11-28T16:40:00.000Z"
      When the lecturer asks the Studio to look again at "2026-11-28T17:00:00.000Z"
      Then it shall have looked in "first" and "second"
      And it shall say it last looked at "2026-11-28T17:00:00.000Z"
