Feature: My files beside the course
  As a lecturer whose slides, notes and labs live in a folder of my own
  I want that folder beside the course, to drag from onto a week
  So that I add material without leaving Studio or changing my own folder

  Scenarios drive the My files use case over a folder held in memory, and the AuthoringPort's drop plan
  over a course held in memory. Nothing is written to the course until the plan is accepted (STU-0001),
  and nothing is ever written to the lecturer's own folder (ADR 0035).

  @stu-0131 @ears-event
  Rule: When a lecturer chooses a folder of their own material, the Studio shall list what is in it by name, folders first, and never write to it.

    Scenario: A folder of slides and a lab
      Given a folder of the lecturer's own holding "Lecture 2.pdf", "Lab/01 Setup.md", "Lab/02 Run.md" and ".DS_Store"
      When the lecturer chooses that folder
      Then My files shall list "Lab, Lecture 2.pdf"

  @stu-0132 @ears-event
  Rule: When a lecturer drags a file or folder from My files onto a week, the Studio shall propose the plan dropping it on that week would, copying it into the course.

    Scenario: A lab folder dragged onto Week 1
      Given a folder of the lecturer's own holding "Lecture 2.pdf", "Lab/01 Setup.md", "Lab/02 Run.md" and ".DS_Store"
      And a course with a week "topic-01"
      When the lecturer drags "Lab" onto "topic-01"
      Then the plan shall add a Lab "Lab" as "topic-01/lab-01"
      When the lecturer accepts the plan
      Then the lecturer's own folder shall be as it was

  @stu-0133 @ears-event
  Rule: When a lecturer puts a file left in the tray in a week, the Studio shall propose placing it in that week.

    Scenario: Slides with no week in their name
      Given a folder of the lecturer's own holding "Lecture 2.pdf", "Lab/01 Setup.md", "Lab/02 Run.md" and ".DS_Store"
      And a course with a week "topic-01"
      When the lecturer drops "Lecture 2.pdf" on the course
      Then the tray shall hold "Lecture 2.pdf"
      When the lecturer puts "Lecture 2.pdf" in "topic-01"
      Then the plan shall add a Talk "Lecture 2" as "topic-01/talk-01"
