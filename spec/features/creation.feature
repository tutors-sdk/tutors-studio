Feature: Creating a course from three questions
  As a lecturer starting a course from nothing
  I want to answer three questions and get a course already shaped like my teaching
  So that I start by adding material, not by learning folder names

  Scenarios drive the headless `new` command over a temporary folder on disk, through the same use case the
  app's New course screen calls.

  @stu-0008 @ears-event
  Rule: When a lecturer answers the three questions, the Studio shall create a course that checks with no errors, with one dated topic per teaching week.

    Scenario: Four weeks of lectures and labs, with a reading week after week 2
      Given an empty place for the course
      When the lecturer creates "Web Development" starting "2027-01-25" for 4 weeks with a reading week after week 2, taught as "lecture-lab"
      Then the command shall print "Created web-development."
      And the course shall have 4 topics
      And the topic for week 3 shall read "Week of 15 February 2027."
      And the new course shall check with no errors

  @stu-0009 @ears-unwanted
  Rule: If an answer is missing or out of range, then the Studio shall name each answer to change and create nothing.

    Scenario: No start date and too many weeks
      Given an empty place for the course
      When the lecturer creates "Web Development" with no start date for 60 weeks, taught as "lecture-lab"
      Then the command shall print "start: Choose the date teaching starts."
      And the command shall also print "weeks: Teaching weeks must be a whole number from 1 to 52."
      And no folder shall have been made

  @stu-0010 @ears-unwanted
  Rule: If the new course's folder already exists, then the Studio shall leave that folder as it was and say that nothing was created.

    Scenario: A folder called web-development is already there
      Given a folder "web-development" already holding "notes.txt"
      When the lecturer creates "Web Development" starting "2027-01-25" for 4 weeks with a reading week after week 2, taught as "lecture-lab"
      Then the command shall print a line starting "Nothing was created"
      And the folder "web-development" shall hold only "notes.txt"

  @stu-0011 @ears-ubiquitous
  Rule: The Studio shall offer every teaching pattern from tutors-create as a card that shows what one week's topic holds.

    Scenario: The lecture and lab card
      When the lecturer is asked how they teach the course
      Then there shall be a card for each of "lecture-lab, lecture-only, project-based, flipped"
      And the "lecture-lab" card shall show a week holding "Talk, Lab"

  @stu-0063 @ears-event
  Rule: When a lecturer says how many lectures, labs and readings a teaching week holds, the Studio shall create every weekly topic holding exactly those.

    Scenario: Two lectures, a lab and a reading every week
      Given an empty place for the course
      When the lecturer creates "Web Development" starting "2027-01-25" for 4 weeks with 2 lectures, 1 lab and 1 reading a week
      Then the command shall print "Created web-development."
      And the topic for week 3 shall hold "lab-01, note-01, talk-01, talk-02"
      And the new course shall check with no errors

  @stu-0064 @ears-unwanted
  Rule: If the week a lecturer shapes would hold nothing, or more than five of one kind, then the Studio shall say what to change and create nothing.

    Scenario: An empty week
      Given an empty place for the course
      When the lecturer creates "Web Development" starting "2027-01-25" for 4 weeks with 0 lectures, 0 labs and 0 readings a week
      Then the command shall print "shape: A week needs at least one lecture, lab or reading."
      And no folder shall have been made
