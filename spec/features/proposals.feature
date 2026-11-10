Feature: An assistant that proposes
  As a lecturer with notes and a week to arrange
  I want the assistant I chose to draft a lab and suggest titles and an order
  So that I start from a draft and only accept what I agree with

  Scenarios drive the AuthoringPort the week and lab screens use, over a course held in memory, with Claude
  answered in memory. The assistant is sent only the markdown named here, and each answer is a plan applied
  as accepted (ADR 0004, ADR 0036).

  @stu-0136 @ears-event
  Rule: When a lecturer asks the chosen assistant to draft a lab from their notes, the Studio shall send it only those notes and propose a plan that adds the steps it drafts after the lab's own, writing nothing until the plan is accepted.

    Scenario: A grid lab drafted from notes
      Given a course whose lab "Grid" already has the step "01.Setup.md"
      And the lecturer has chosen Claude, which drafts the steps "Make the grid" and "Place the boxes"
      When the lecturer asks Claude to draft the lab from their notes
      Then Claude shall have been sent the notes and nothing else from the course
      And the plan shall add "02.Make-the-grid.md" and "03.Place-the-boxes.md"
      And nothing shall have been written to the course
      When the lecturer accepts the plan
      Then the lab shall have 3 steps

  @stu-0137 @ears-event
  Rule: When a lecturer asks the chosen assistant to suggest titles and an order for a week, the Studio shall send it only the week's titles and the start of each page, and propose one plan that retitles and reorders the week as suggested.

    Scenario: Week 1 retitled and reordered
      Given a course whose week "Week 1" holds the talks "Intro" and "Flexbox and Grid" and a lab "Grid"
      And the lecturer has chosen Claude, which suggests "Layout with flexbox" first and "Getting started" second
      When the lecturer asks Claude to suggest titles and an order for the week
      Then Claude shall have been sent each item's title and the start of its page
      And nothing shall have been written to the course
      When the lecturer accepts the plan
      Then the week's talks shall read "Layout with flexbox" then "Getting started"
      And the course shall have no errors

  @stu-0138 @ears-unwanted
  Rule: If no assistant is chosen, or its answer can't be read as steps or a list, then the Studio shall say so and propose no plan.

    Scenario Outline: Nothing Studio can use
      Given a course whose lab "Grid" already has the step "01.Setup.md"
      And <assistant>
      When the lecturer asks for a draft of the lab from their notes
      Then Studio shall say "<words>"
      And there shall be no plan

      Examples:
        | assistant                                            | words                     |
        | no assistant is chosen                               | No assistant is chosen    |
        | the lecturer has chosen Claude, which answers in prose | had no steps Studio could read |
