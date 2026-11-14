Feature: Starting a course from a template
  As a lecturer starting a course from nothing
  I want to pick a whole course shaped like the Tutors reference course, for the kind of module I teach and its length
  So that I start from a solid course and only write my material into it

  Scenarios drive the headless `templates` and `new --template` commands over a temporary folder on disk,
  through the same use case the app's New course screen calls.

  @stu-0162 @ears-ubiquitous
  Rule: The Studio shall offer three ways to start a new course: a reference course picked from a list, the Lecture and lab template in 2, 4, 6, 8, 10 or 12 weeks, and a week the lecturer shapes.

    Scenario: The ways to start on offer
      When the lecturer lists the templates
      Then there shall be the template "lecture-lab" in "2, 4, 6, 8, 10, 12" weeks
      And there shall be the reference courses "web-dev-2, mobile-app-dev, agile-soft-dev, reference-course, lc-cs"

  @stu-0151 @ears-event
  Rule: When a lecturer names a course and picks a template and a length, the Studio shall create a course that checks with no errors, with one week per teaching week holding what the template's week holds.

    Scenario: Every template at every length checks clean
      Given an empty place for the course
      When the lecturer creates a course from every template at every length
      Then every course shall check with no errors

    Scenario: Four weeks of lectures and labs
      Given an empty place for the course
      When the lecturer creates "Ethics" from the "lecture-lab" template for 4 weeks
      Then the command shall print "Created ethics."
      And the course shall have 4 weeks
      And the week 2 shall hold "lab-01-week-2-lab, note-01-week-2-supporting-resources, talk-01-week-2-lecture"
      And beside the weeks shall be "Module handbook, Introduction"

  @stu-0152 @ears-event
  Rule: When a lecturer picks a template of six weeks or more, the Studio shall group the weeks into sections and make the last week a review with a quiz.

    Scenario: Twelve weeks of lectures and labs
      Given an empty place for the course
      When the lecturer creates "Web Development" from the "lecture-lab" template for 12 weeks
      Then the course shall have sections "Weeks 1–4, Weeks 5–8, Weeks 9–12"
      And the week 12 shall hold "note-01-what-we-covered, quiz-01-check-your-understanding"
      And week 11 shall still hold "lab-01-week-11-lab, note-01-week-11-supporting-resources, talk-01-week-11-lecture"

    Scenario: Two weeks stay in one section, with no review
      Given an empty place for the course
      When the lecturer creates "Web Development" from the "lecture-lab" template for 2 weeks
      Then the course shall have sections "Weeks 1–2"
      And the week 2 shall hold "lab-01-week-2-lab, note-01-week-2-supporting-resources, talk-01-week-2-lecture"

  @stu-0153 @ears-unwanted
  Rule: If the template or the length a lecturer asks for is not one Studio offers, then the Studio shall name each answer to change and create nothing.

    Scenario: An unknown template for five weeks
      Given an empty place for the course
      When the lecturer creates "Web Development" from the "bootcamp" template for 5 weeks
      Then the command shall print "template: Pick one of the templates Studio offers."
      And the command shall also print "weeks: A template runs for 2, 4, 6, 8, 10 or 12 weeks."
      And no folder shall have been made

    Scenario: An unknown reference course
      Given an empty place for the course
      When the lecturer creates "Web Development" from the "bootcamp" reference course
      Then the command shall print "template: Pick one of the reference courses Studio offers."
      And no folder shall have been made

  @stu-0154 @ears-event
  Rule: When a lecturer opens a course made from a template, the Studio shall show every week as still to write.

    Scenario: A new lecture and lab course
      Given an empty place for the course
      When the lecturer creates "Programming" from the "lecture-lab" template for 6 weeks
      And the lecturer opens the course
      Then every one of the 6 weeks shall be still to write

    Scenario: A new course from Web Development II
      Given an empty place for the course
      When the lecturer creates "Web Development II" from the "web-dev-2" reference course
      And the lecturer opens the course
      Then every one of the 8 weeks shall be still to write

  @stu-0163 @ears-event
  Rule: When a lecturer names a course and picks a reference course, the Studio shall create a course that checks with no errors and holds every week, unit, item and lab step of the course it is shaped on, titled as that course titles them.

    Scenario: Every reference course checks clean and keeps its shape
      Given an empty place for the course
      When the lecturer creates a course from every reference course
      Then every course shall check with no errors
      And every course shall hold each week, unit, item and lab step of the course it is shaped on, by title

    Scenario: Week 1 of Web Development II
      Given an empty place for the course
      When the lecturer creates "Web Development II" from the "web-dev-2" reference course
      Then the week 1 shall be titled "1: Introducing Javascript"
      And its unit "Introducing Javascript" shall hold the lab "Lab 01 JS Intro" with 9 steps and the talks "Module Overview; JS Introduction; Variables & Logic; Const, Let & Objects"
