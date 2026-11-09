Feature: Writing a page in plain language
  As a lecturer who writes in a word processor, not in markdown
  I want to write my pages with headings, bold, lists, links and pictures
  So that I never learn markdown, and the page still looks right in Tutors

  Scenarios open pages through the AuthoringPort and write them through the same editor the app's
  "Write" button opens (ADR 0026), over a course held in memory.

  @stu-0072 @ears-event
  Rule: When a lecturer writes a page in plain language, the Studio shall keep it as markdown that reads back the same, and save it only through a plan the lecturer accepts.

    Scenario: A lab step written plainly
      Given a course whose lab step "topic-01/lab-01/01.Setup.md" has a heading, bold, a list, a link, a picture and code
      When the lecturer opens the step to write
      Then Studio shall write it plainly
      And writing it back unchanged shall give the same markdown
      When the lecturer adds a paragraph "Now open the terminal." and saves
      Then nothing shall have been written to the course
      When the lecturer accepts the plan
      Then the step shall end with "Now open the terminal."

  @stu-0073 @ears-unwanted
  Rule: If a page holds something plain writing can't keep, then the Studio shall say what it is and leave the page to the markdown editor.

    Scenario Outline: Pages plain writing can't keep
      Given a page that holds <what>
      When the lecturer opens it to write
      Then Studio shall say the page has "<named>"

      Examples:
        | what                     | named                                    |
        | settings at the top      | settings at the top between --- lines    |
        | some HTML                | HTML                                     |
        | a table                  | a table                                  |
        | a checklist              | a checklist                              |
        | HTML only inside code    | nothing                                  |
