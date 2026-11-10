Feature: Building a lab's steps
  As a lecturer writing a practical
  I want to add, order, rename and remove its steps, and put pictures in them
  So that I never number step files by hand or type a picture's address

  Scenarios drive the AuthoringPort the lab's Steps panel uses, over a course held in memory. Each change
  is a plan applied as accepted (ADR 0004); a removed step goes to the bin (ADR 0032).

  @stu-0123 @ears-event
  Rule: When a lecturer adds a step to a lab by its title, the Studio shall propose a plan that writes the next numbered step page, titled as typed, at the end of the lab.

    Scenario: A third step
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer adds the step "Flex box"
      Then the plan shall write "topic-01/lab-01/03.Flex-box.md"
      When the lecturer accepts the plan
      Then the lab's steps shall be "01.Setup.md, 02.Grid.md, 03.Flex-box.md"
      And the course shall have no errors

  @stu-0124 @ears-event
  Rule: When a lecturer moves a lab step earlier or later, the Studio shall propose a plan that renumbers the steps in their new order, keeping every page as it is.

    Scenario: Grid before setup
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer moves "02.Grid.md" earlier
      And the lecturer accepts the plan
      Then the lab's steps shall be "01.Grid.md, 02.Setup.md"
      And "topic-01/lab-01/01.Grid.md" shall still read "# Grid"

    Scenario: The first step can't go earlier
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer moves "01.Setup.md" earlier
      Then Studio shall say "already at that end"

  @stu-0125 @ears-event
  Rule: When a lecturer renames or removes a lab step, the Studio shall propose a plan that renames the page and its heading, or moves it to the bin and renumbers the steps after it.

    Scenario: Renaming a step
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer renames "02.Grid.md" to "CSS grid"
      And the lecturer accepts the plan
      Then the lab's steps shall be "01.Setup.md, 02.CSS-grid.md"
      And "topic-01/lab-01/02.CSS-grid.md" shall still read "# CSS grid"

    Scenario: Removing the first step
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer removes "01.Setup.md"
      And the lecturer accepts the plan
      Then the lab's steps shall be "01.Grid.md"
      And the bin shall hold "01.Setup.md"
      And the course shall have no errors

  @stu-0126 @ears-event
  Rule: When a lecturer chooses a picture for a lab step, the Studio shall propose a plan that copies it into the lab's img folder under a plain name and shows it at the end of the step.

    Scenario: A screenshot for the grid step
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer chooses "Grid Screenshot.PNG" for "02.Grid.md"
      And the lecturer accepts the plan
      Then "topic-01/lab-01/img/grid-screenshot.png" shall hold the picture
      And "topic-01/lab-01/02.Grid.md" shall end with "![grid screenshot](img/grid-screenshot.png)"
      And the course shall have no errors

    Scenario: A file that isn't a picture
      Given a lab "topic-01/lab-01" with the steps "01.Setup.md" and "02.Grid.md"
      When the lecturer chooses "notes.docx" for "02.Grid.md"
      Then Studio shall say "is not a picture"
