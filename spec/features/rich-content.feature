Feature: Quizzes, slides and diagrams checked and previewed
  As a lecturer who writes quizzes, Marp slides and Mermaid diagrams
  I want Studio to show them the way the reader will, and tell me what won't show
  So that no question, slide or diagram goes missing in front of my students

  Scenarios drive the headless `check` and `preview` commands over an in-memory course, with the same
  Mermaid and Marp adapters the app uses (ADR 0018). The sentences come from @tutors/course-rules.

  @stu-0012 @ears-event
  Rule: When a lecturer opens a course, the Studio shall check every Mermaid diagram with the Mermaid the reader draws with and list each one that won't draw.

    Scenario: An unclosed bracket in a page's flowchart
      Given a course whose note draws a flowchart with an unclosed bracket on its third line
      When the lecturer checks the course
      Then the command shall print a finding for "topic-01/note-01/note.md" that says "Mermaid stopped at line 3 of the diagram"

    Scenario: The same flowchart closed
      Given a course whose note draws a flowchart that is complete
      When the lecturer checks the course
      Then the command shall print "Everything checks out."

  @stu-0013 @ears-event
  Rule: When a lecturer selects a Talk that holds a Marp deck, the Studio shall show the deck's slides as Marp renders them for the reader.

    Scenario: A two-slide deck on the gaia theme
      Given a course whose talk holds a two-slide Marp deck on the gaia theme
      When the lecturer previews "topic-01/talk-01"
      Then the command shall print "topic-01/talk-01/talk.marp: 2 slides"

  @stu-0014 @ears-event
  Rule: When a lecturer selects a folder whose pages hold Mermaid diagrams, the Studio shall show each diagram with the line of the page it starts on.

    Scenario: A note with two diagrams
      Given a course whose note holds two diagrams
      When the lecturer previews "topic-01/note-01"
      Then the command shall print a line for "topic-01/note-01/note.md" that says "diagrams on lines 6 and 13"

  @stu-0015 @ears-event
  Rule: When a lecturer opens a course with a quiz question the reader leaves out, the Studio shall name the question and say why it is left out.

    Scenario: A question with no right answer
      Given a course whose quiz has a second question with no right answer
      When the lecturer checks the course
      Then the command shall print a finding for "topic-01/quiz-01/quiz.md" that says 'Question 2 ("Which tag makes a link?")'
