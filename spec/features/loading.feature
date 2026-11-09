Feature: Loading a course from any folder
  As a lecturer with a semester of material in a folder
  I want to point Studio at the folder
  So that it becomes a Tutors course without my moving a file by hand

  Scenarios drive the headless `load` command over temporary folders on disk, through the same use case
  the app's "Load a course" button calls. The folder loaded is only ever read.

  @stu-0065 @ears-event
  Rule: When a lecturer loads a folder that already holds a Tutors course, the Studio shall open it as it is and write nothing.

    Scenario: A folder with a course.md
      Given a folder holding "course.md" and "topic-01/topic.md"
      When the lecturer loads it as "Web Development"
      Then the command shall print "This folder is already a Tutors course: open it as it is."
      And no course shall have been made

  @stu-0066 @ears-event
  Rule: When a lecturer loads a folder of their own material, the Studio shall create a new course with a topic for each week the names give, each recognised file in its own learning object, and leave the folder they loaded unchanged.

    Scenario: Two weeks of slides, a reading and a lab
      Given a folder holding "Week 1/Lecture 1.pdf", "Week 1/Reading.md", "Week 2/Lab/01 Setup.md", "Week 2/Lab/02 Run.md" and "marks.csv"
      When the lecturer loads it as "Web Development"
      Then the command shall print "Created web-development: 2 weeks, 3 items."
      And the course shall hold "unit-1/topic-01/talk-01/Lecture-1.pdf" and "unit-1/topic-02/lab-01/01.Setup.md"
      And the command shall also print a line starting "Left in your folder: marks.csv."
      And the new course shall check with no errors
      And the folder loaded shall be as it was

  @stu-0067 @ears-unwanted
  Rule: If a loaded folder holds nothing Studio can place in a week, then the Studio shall say what it looks for and create nothing.

    Scenario: A folder of spreadsheets
      Given a folder holding "marks.csv" and "attendance.xlsx"
      When the lecturer loads it as "Web Development"
      Then the command shall print a line starting "material: Studio found nothing in this folder it can place in a week."
      And no course shall have been made
