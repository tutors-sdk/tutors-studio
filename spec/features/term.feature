Feature: Running the term
  As a lecturer teaching the course this term
  I want Studio to open on this week, remind me what is due out, and start next year from this year
  So that I run the module from one place

  A release date is kept beside the ignore list that hides a week, in properties.yaml (ADR 0049). Studio
  publishes by sending built files, so a hidden week appears only when the course is published again:
  a due week is a reminder and one press. Scenarios drive `pnpm headless <course> term`, `release`,
  `show-due` and `roll-over` over a course in memory, on 3 February 2027.

  Background:
    Given a course "Web Development" with four weeks dated from Monday 25 January 2027
    And today is 3 February 2027

  @stu-0196 @ears-state
  Rule: While a course has a calendar, the Studio shall show the current teaching week first on the course home.

    Scenario: The second week of term
      When the lecturer asks for the term
      Then the command prints "This is week 2 of the term: Week 2."

    Scenario: A course with no calendar
      Given the course has no calendar
      When the lecturer asks for the term
      Then the command says to give the course a start date first

  @stu-0197 @ears-event
  Rule: When a lecturer gives a week a release date, the Studio shall show a plan that hides the week and keeps the date beside it in properties.yaml.

    Scenario: Week 4 out on the 15th
      When the lecturer gives "topic-04" the release date "2027-02-15"
      Then the plan hides "Week 4" from students until "15 Feb 2027"
      And properties.yaml hides "topic-04" and dates it "2027-02-15"
      And the command for the term prints "Hidden: Week 4, due out 15 Feb 2027"

  @stu-0198 @ears-event
  Rule: When a week's release date has arrived and the week is still hidden, the Studio shall offer to publish it and show the change as a plan.

    Scenario: Week 3 is due today
      Given "topic-03" is hidden with the release date "2027-02-03"
      When the lecturer asks for the term
      Then the command prints "Due: Week 3. Run show-due topic-03, then publish."
      When the lecturer shows the due week "topic-03"
      Then the plan shows "Week 3" to students
      And properties.yaml no longer hides "topic-03"

    Scenario: A week not yet due
      Given "topic-04" is hidden with the release date "2027-02-15"
      When the lecturer shows the due week "topic-04"
      Then the command prints "That week isn't due out yet."

  @stu-0199 @ears-event
  Rule: When a lecturer starts next year from a course, the Studio shall make a new course folder with the same content and outcomes, no release dates, and a calendar from the new first Monday, and leave this course as it was.

    Scenario: Web Development 2028
      Given "topic-04" is hidden with the release date "2027-02-15"
      And the course has outcomes
      When the lecturer starts "Web Development 2028" from it, teaching from Wednesday 12 January 2028
      Then the new folder "web-development-2028" holds every week, the outcomes and the course's pictures
      And its course is called "Web Development 2028"
      And its calendar starts on "2028-01-10"
      And its properties.yaml has no release dates
      And this course is as it was
