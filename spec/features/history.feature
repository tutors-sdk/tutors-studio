Feature: Undo and history
  As a lecturer who has just changed my course
  I want to see what Studio changed and put any change back
  So that trying something is never a risk

  Scenarios drive the headless `fix`, `add-quiz`, `save-quiz`, `history` and `undo` commands over one
  in-memory course in one session. Putting a change back is a plan like any other (ADR 0004); a file the
  change added goes to the bin, .tutors-bin in the course, which Tutors never reads (ADR 0032).

  @stu-0091 @ears-event
  Rule: When a lecturer puts back a change Studio applied, the Studio shall show the plan that reverses it and apply that plan only once it is accepted.

    Scenario: A safe rename put back
      Given a course with a talk folder named "talk-Intro"
      And the lecturer has made the safe fixes
      When the lecturer asks to put back the latest change
      Then the plan shall move "topic-01/talk-intro" back to "topic-01/talk-Intro"
      And the course shall still have "topic-01/talk-intro" until the plan is accepted
      When the lecturer accepts the plan
      Then the course shall have "topic-01/talk-Intro/talk.md" again

  @stu-0092 @ears-ubiquitous
  Rule: The Studio shall list each change it applied to the open course since it was opened, newest first, with the time it was applied.

    Scenario: Two changes, newest first
      Given a course with a talk folder named "talk-Intro"
      And the lecturer has made the safe fixes
      And the lecturer has added a quiz "Week one check" to "topic-01"
      When the lecturer asks for the history
      Then the command shall print "2026-11-10T09:01:00.000Z Add a quiz with 2 questions as topic-01/quiz-week-one-check"
      And the command shall then print "2026-11-10T09:00:00.000Z Make the 1 safe fix the course map suggests"

  @stu-0093 @ears-unwanted
  Rule: If a file a change wrote has changed since, then the Studio shall keep that change in place and name the file.

    Scenario: A quiz edited by hand after Studio added it
      Given a course with a talk folder named "talk-Intro"
      And the lecturer has added a quiz "Week one check" to "topic-01"
      And the quiz page has been edited outside Studio
      When the lecturer puts back the latest change
      Then the command shall print "topic-01/quiz-week-one-check/quiz.md has changed since, so putting this back would lose that work. Change it by hand, or put back the later changes first."
      And the quiz page shall keep the edit

  @stu-0094 @ears-event
  Rule: When a lecturer puts back a change that added files, the Studio shall move them to the course's bin and delete nothing.

    Scenario: A new quiz put back
      Given a course with a talk folder named "talk-Intro"
      And the lecturer has added a quiz "Week one check" to "topic-01"
      When the lecturer puts back the latest change
      Then the command shall print "Done: Put back: add a quiz with 2 questions as topic-01/quiz-week-one-check."
      And the course shall have ".tutors-bin/quiz-week-one-check/quiz.md"
      And the course shall not have "topic-01/quiz-week-one-check"
