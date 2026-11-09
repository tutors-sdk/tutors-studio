Feature: Creating a course from two questions
  As a lecturer starting a course from nothing
  I want to name it and say how a teaching week breaks down, and get a course already shaped like my teaching
  So that I start by adding material, not by learning folder names or choosing dates

  Scenarios drive the headless `new` command over a temporary folder on disk, through the same use case the
  app's New course screen calls.

  @stu-0083 @ears-event
  Rule: When a lecturer names a course and says how many weeks it runs, the Studio shall create a course that checks with no errors, with one undated topic per week and no calendar.

    Scenario: Four weeks of a lecture and a lab
      Given an empty place for the course
      When the lecturer creates "Web Development" for 4 weeks
      Then the command shall print "Created web-development."
      And the course shall have 4 topics
      And no topic shall carry a date
      And the course shall have no calendar
      And beside the weeks shall be "Introduction, Module handbook"
      And the new course shall check with no errors

  @stu-0084 @ears-optional
  Rule: Where the lecturer says students build a project, the Studio shall put a project specification and starter code beside the weeks.

    Scenario: A project across the weeks
      Given an empty place for the course
      When the lecturer creates "Web Development" for 4 weeks with a project
      Then beside the weeks shall be "Project specification, Starter code"
      And the new course shall check with no errors

  @stu-0009 @ears-unwanted
  Rule: If an answer is missing or out of range, then the Studio shall name each answer to change and create nothing.

    Scenario: No name and too many weeks
      Given an empty place for the course
      When the lecturer creates a course with no name for 60 weeks
      Then the command shall print "name: Give the course a name with at least one letter or number."
      And the command shall also print "weeks: Teaching weeks must be a whole number from 1 to 52."
      And no folder shall have been made

  @stu-0010 @ears-unwanted
  Rule: If the new course's folder already exists, then the Studio shall leave that folder as it was and say that nothing was created.

    Scenario: A folder called web-development is already there
      Given a folder "web-development" already holding "notes.txt"
      When the lecturer creates "Web Development" for 4 weeks
      Then the command shall print a line starting "Nothing was created"
      And the folder "web-development" shall hold only "notes.txt"

  @stu-0063 @ears-event
  Rule: When a lecturer says how many lectures, labs and readings a teaching week holds, the Studio shall create every weekly topic holding exactly those.

    Scenario: Two lectures, a lab and a reading every week
      Given an empty place for the course
      When the lecturer creates "Web Development" for 4 weeks with 2 lectures, 1 lab and 1 reading a week
      Then the command shall print "Created web-development."
      And the topic for week 3 shall hold "lab-01, note-01, talk-01, talk-02"
      And the new course shall check with no errors

  @stu-0064 @ears-unwanted
  Rule: If the week a lecturer shapes would hold nothing, or more than five of one kind, then the Studio shall say what to change and create nothing.

    Scenario: An empty week
      Given an empty place for the course
      When the lecturer creates "Web Development" for 4 weeks with 0 lectures, 0 labs and 0 readings a week
      Then the command shall print "shape: A week needs at least one lecture, lab or reading."
      And no folder shall have been made
