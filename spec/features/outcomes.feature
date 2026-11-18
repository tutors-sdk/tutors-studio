Feature: Learning outcomes
  As a lecturer designing a module
  I want to write what students should be able to do, and see where the course teaches, practises and assesses each
  So that I can spot an outcome nobody practises before the term starts

  Outcomes live in the course folder: outcomes.yaml at the root, and one front matter line on each item
  that serves them, `outcomes: [LO1, LO3]` (ADR 0048). A lecture or reading teaches, a lab practises and a
  quiz assesses. Scenarios drive `pnpm headless <course> outcomes` and `tag` over a course in memory.

  Background:
    Given a course "Web Development" with three weeks
    And week 1 holds a lecture "How the web works" and a lab "First page"
    And week 2 holds a lecture "Forms" and a quiz "Forms quiz"
    And week 3 holds a lecture "Review"

  @stu-0187 @ears-event
  Rule: When a lecturer writes the course's learning outcomes, the Studio shall show a plan that keeps each in outcomes.yaml at the course root with an id, a sentence that begins "Students can" and one of the six Bloom levels.

    Scenario: Writing two outcomes
      When the lecturer writes the outcomes "Understand: Students can explain how a web page is built|Apply: Students can build a page with a form"
      Then the command prints "Plan: Write the course's 2 learning outcomes."
      And outcomes.yaml holds LO1 "Students can explain how a web page is built" at "Understand"
      And outcomes.yaml holds LO2 "Students can build a page with a form" at "Apply"

    Scenario: An outcome that doesn't say what students can do
      When the lecturer writes the outcomes "Apply: Forms"
      Then the command prints a line starting "Outcome 1: Write what students can do, starting"
      And the course has no outcomes.yaml

  @stu-0188 @ears-event
  Rule: When a lecturer tags an item with an outcome, the Studio shall show the change as a plan that writes one line to that item.

    Scenario: Tagging a lab
      Given the course's outcomes are written
      When the lecturer tags "topic-01/lab-01" with "LO1,LO2"
      Then the command prints the plan to tag "First page" with "LO1, LO2"
      And only "topic-01/lab-01/01.first.md" changed, with the line "outcomes: [LO1, LO2]"

    Scenario: Saving a quiz keeps what it assesses
      Given the course's outcomes are written
      And the lecturer tagged "topic-02/quiz-01" with "LO2"
      When the lecturer saves the quiz in "topic-02/quiz-01" with the designer
      Then "topic-02/quiz-01/quiz.md" still has the line "outcomes: [LO2]"

  @stu-0189 @ears-state
  Rule: While an outcome has no lab tagged to it, the Studio shall mark it "Not yet practised" on the coverage map.

    Scenario: Taught but never practised
      Given the course's outcomes are written
      And the lecturer tagged "topic-02/talk-01" with "LO2"
      When the lecturer asks for the outcomes
      Then the command prints "LO2 (Apply) Students can build a page with a form: Not yet practised"

  @stu-0190 @ears-unwanted
  Rule: If an outcome is assessed in a week before any week teaches it, then the Studio shall flag it "Assessed before it is taught" on the coverage map.

    Scenario: A quiz before the lecture
      Given the course's outcomes are written
      And the lecturer tagged "topic-02/quiz-01", "topic-01/lab-01" and "topic-03/talk-01" with "LO1"
      When the lecturer asks for the outcomes
      Then the command prints "LO1 (Understand) Students can explain how a web page is built: Assessed before it is taught"
      And the command prints "  Week 2: Quiz"

  @stu-0191 @ears-state
  Rule: While a course has outcomes and a week has nothing tagged, the Studio shall flag the week "Nothing tagged" on the coverage map.

    Scenario: A week that serves no outcome
      Given the course's outcomes are written
      And the lecturer tagged "topic-01/talk-01" with "LO1"
      When the lecturer asks for the outcomes
      Then the command prints "Week 2: Nothing tagged"
      And the command prints "Week 3: Nothing tagged"

  @stu-0192 @ears-optional
  Rule: Where a course has no outcomes written, the Studio shall show no coverage map and no flags about outcomes.

    Scenario: A course with no outcomes
      When the lecturer asks for the outcomes
      Then the command prints "This course has no learning outcomes yet."
      And no line says "Nothing tagged" or "Not yet practised"

  @stu-0193 @ears-ubiquitous
  Rule: The Studio shall keep outcomes so that Tutors builds and checks the course as it would without them.

    Scenario: The rules read the course the same
      Given the course's outcomes are written
      And the lecturer tagged "topic-01/lab-01" and "topic-01/talk-01" with "LO1"
      Then the course's findings are the same as before the outcomes
      And each tagged item keeps its title

  @stu-0194 @ears-event
  Rule: When a lecturer with an assistant chosen asks for outcomes from their module description, the Studio shall show the outcomes it suggests as a plan to accept.

    Scenario: Outcomes suggested by Claude
      Given Claude is chosen and answers with two outcomes, one at a level Bloom doesn't have
      When the lecturer asks for outcomes from "This module teaches HTML, CSS and forms."
      Then the plan adds "LO1" at "Understand" and nothing at the unknown level
      And the module description is what Claude was sent
      And nothing is written until the plan is accepted

  @stu-0195 @ears-event
  Rule: When a lecturer with an assistant chosen asks which outcomes a week's items serve, the Studio shall show the tags it suggests as one plan to accept.

    Scenario: Week 1 tagged by Claude
      Given the course's outcomes are written
      And Claude is chosen and says the lab in week 1 serves "LO2" and an outcome the course hasn't got
      When the lecturer asks which outcomes week 1's items serve
      Then the plan writes "outcomes: [LO2]" to "topic-01/lab-01/01.first.md" and nothing else
      And nothing is written until the plan is accepted
