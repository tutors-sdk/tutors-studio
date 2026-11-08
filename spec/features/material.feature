Feature: Adding a lecturer's own material to a course
  As a lecturer with a semester of slides, notes and lab sheets already made
  I want to drop them on the course map and have each land in the right place
  So that I never learn Tutors' folder names to add what I already have

  Scenarios drive the AuthoringPort the app's drop zone uses, over a course held in memory, with
  course-rules' shape from content deciding what each file becomes. Nothing is written until the plan
  is accepted (STU-0001).

  @stu-0026 @ears-ubiquitous
  Rule: The Studio shall show each folder on the course map by the title its card shows, and by its folder name when it has none.

    Scenario: A topic titled Week 1 and a talk with no title
      Given a course whose topic-01 is titled "Week 1" and whose talk has an empty talk.md
      When the lecturer opens the course
      Then "topic-01" shall show as "Week 1"
      And "topic-01/talk-01" shall show as "talk-01"

  @stu-0027 @ears-event
  Rule: When a lecturer drops files on a topic, the Studio shall propose a plan that puts each file it recognises in its own learning object of the kind Tutors shows it as.

    Scenario: Slides, a reading, a lab and a link dropped on Week 1
      Given a course whose topic-01 is titled "Week 1" and already holds talk-01
      When the lecturer drops "Lecture 3 Intro.pdf", "Reading.docx", "Lab/01 Setup.md", "Lab/02 Run.md" and "Python docs.url" on "topic-01"
      Then the plan shall add a Talk "Lecture 3 Intro" as "topic-01/talk-02"
      And the plan shall add a Note "Reading" as "topic-01/note-01"
      And the plan shall add a Lab "Lab" as "topic-01/lab-01" with steps "01.Setup.md" and "02.Run.md"
      And the plan shall add a Web link "Python docs" as "topic-01/web-01"
      And nothing shall have been written to the course
      When the lecturer accepts the plan
      Then the course shall have no errors

  @stu-0028 @ears-event
  Rule: When a lecturer drops a folder of material on the course, the Studio shall propose placing each item in the topic for the week its name gives.

    Scenario: A folder of weekly slides
      Given a course with topics for weeks 1 and 2
      When the lecturer drops "Week 2/Slides.pdf" and "Lecture 1.pdf" on the course
      Then the plan shall add a Talk "Slides" as "topic-02/talk-01"
      And the plan shall add a Talk "Lecture 1" as "topic-01/talk-01"

  @stu-0029 @ears-unwanted
  Rule: If Studio can't tell what a dropped file is or which topic it belongs in, then the Studio shall leave it in the tray with the reason and place nothing for it.

    Scenario: A spreadsheet, a file with no week and a week with no topic
      Given a course with topics for weeks 1 and 2
      When the lecturer drops "marks.csv", "misc.pdf" and "Week 5/Slides.pdf" on the course
      Then the tray shall hold "marks.csv" because "Studio can't tell what kind of material this is"
      And the tray shall hold "misc.pdf" because "Nothing in its name says which week it is for"
      And the tray shall also hold "Week 5/Slides.pdf" because "the course has no topic for that week yet"
      And there shall be no plan
