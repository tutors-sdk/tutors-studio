Feature: Adding to a course in the lecturer's own words
  As a lecturer who thinks in lectures, labs and weeks
  I want to add them by those names
  So that I never learn that Tutors reads talk-, lab- and topic- folders

  Scenarios drive the AuthoringPort the app's "Add to this week" form uses, over a course held in
  memory. Nothing is written until the plan is accepted (STU-0001).

  @stu-0059 @ears-ubiquitous
  Rule: The Studio shall offer what a lecturer can add by the lecturer's own words, and map each word to the kind Tutors reads from a folder's name.

    Scenario Outline: The words a lecturer uses
      Given the words Studio offers
      Then "<word>" shall make a "<kind>"

      Examples:
        | word      | kind   |
        | Lecture   | talk   |
        | Practical | lab    |
        | Handout   | note   |
        | Website   | web    |
        | Repo      | github |
        | Module    | topic  |

  @stu-0060 @ears-event
  Rule: When a lecturer adds a lecture, lab, reading, link or code repository to a week by its plain name and a title, the Studio shall propose a plan that makes the folder Tutors reads and its first files.

    Scenario: A lab and a lecture added to Week 1
      Given a course whose topic-01 is titled "Week 1" and already holds lab-01
      When the lecturer adds a "Lab" called "CSS grid" to "topic-01"
      Then the plan shall make "topic-01/lab-02-css-grid" with "00.CSS-grid.md"
      And nothing shall have been written to the course
      When the lecturer accepts the plan
      Then "topic-01/lab-02-css-grid" shall show as a "Lab" titled "CSS grid"

    Scenario: A lecture added to Week 1
      Given a course whose topic-01 is titled "Week 1" and already holds lab-01
      When the lecturer adds a "lecture" called "Flexbox" to "topic-01"
      Then the plan shall make "topic-01/talk-01-flexbox" with "slides.marp"
      When the lecturer accepts the plan
      Then the course shall have no errors

    Scenario: A link with its address
      Given a course whose topic-01 is titled "Week 1" and already holds lab-01
      When the lecturer adds a "Link" called "MDN on grid" at "https://developer.mozilla.org/en-US/docs/Web/CSS/grid" to "topic-01"
      Then the plan shall make "topic-01/web-01-mdn-on-grid" with "weburl"
      When the lecturer accepts the plan
      Then the course shall have no errors

  @stu-0061 @ears-event
  Rule: When a lecturer adds a week to the course or to a unit, the Studio shall propose a plan that makes the next numbered topic titled as the lecturer typed it.

    Scenario: Week 2 added to the course
      Given a course whose topic-01 is titled "Week 1" and already holds lab-01
      When the lecturer adds a "Week" called "Week 2: Layout" to the course
      Then the plan shall make "topic-02" with "topic.md"
      When the lecturer accepts the plan
      Then "topic-02" shall show as a "Topic" titled "Week 2: Layout"

  @stu-0062 @ears-unwanted
  Rule: If the lecturer's word, title, address or place can't make an item, then the Studio shall say what to change and propose no plan.

    Scenario: Answers Studio can't use
      Given a course whose topic-01 is titled "Week 1" and already holds lab-01
      When the lecturer adds a "Seminar" called "Ethics" to "topic-01"
      Then Studio shall say "doesn't know"
      When the lecturer then adds a "Lab" called "" to "topic-01"
      Then Studio shall also say "Give the lab a title"
      When the lecturer adds a "Link" called "Docs" at "docs.python.org" to "topic-01"
      Then Studio shall still say "starting with https://"
      When the lecturer adds a "Lab" called "Grid" to the course
      Then Studio shall say at last "A lab goes in a week"
      And nothing shall have been written to the course

  @stu-0068 @ears-event
  Rule: When a lecturer makes a folder students can't see into a lecture, lab, reading or week by its plain name, the Studio shall propose a plan that renames the folder to the kind Tutors reads, keeps everything inside it, and adds only the files that kind still needs.

    Scenario: A folder of slides made into a lecture
      Given a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"
      When the lecturer makes "topic-01/Intro slides" a "Lecture"
      Then the plan shall move "topic-01/Intro slides" to "topic-01/talk-01-intro-slides"
      And the plan shall write "topic-01/Intro slides/talk.md"
      And the plan shall write nothing else
      And nothing shall have been written to the course
      When the lecturer accepts the plan
      Then "topic-01/talk-01-intro-slides" shall show as a "Talk" titled "Intro slides"
      And "topic-01/talk-01-intro-slides/intro.pdf" shall still be there

    Scenario: A loose folder made into a week
      Given a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"
      When the lecturer makes "Week 2" a "Week"
      Then the plan shall move "Week 2" to "topic-02"
      When the lecturer accepts the plan
      Then "topic-02" shall show as a "Topic" titled "Week 2"

  @stu-0069 @ears-event
  Rule: When a lecturer makes a folder of pages into a lab, the Studio shall propose numbering its unnumbered pages as steps, in name order, after any steps it already has.

    Scenario: A practical's pages become steps
      Given a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"
      When the lecturer makes "topic-01/Grid practical" a "Lab"
      Then the plan shall move "topic-01/Grid practical/setup.md" to "topic-01/Grid practical/01.setup.md"
      And the plan shall also move "topic-01/Grid practical/the grid.md" to "topic-01/Grid practical/02.the-grid.md"
      When the lecturer accepts the plan
      Then "topic-01/lab-02-grid-practical" shall show as a "Lab" titled "Setup"
      And "topic-01/lab-02-grid-practical" shall have no errors

  @stu-0070 @ears-unwanted
  Rule: If the lecturer's word can't make the folder something students see where it sits, then the Studio shall say which words can and propose no plan.

    Scenario: Words that don't fit the folder
      Given a course whose topic-01 holds lab-01 and the lecturer's own folders "Intro slides" and "Grid practical"
      When the lecturer makes "topic-01/Intro slides" a "Week"
      Then Studio shall say "a lecture, a lab or a reading"
      When the lecturer then makes "topic-01/Intro slides" a "Link"
      Then Studio shall also say "a lecture, a lab or a reading"
      When the lecturer finally makes "topic-01/lab-01" a "Lab"
      Then Studio shall still say "already see this as a lab"
      And nothing shall have been written to the course
