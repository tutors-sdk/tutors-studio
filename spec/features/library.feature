Feature: The library
  As a lecturer with courses scattered across my computer
  I want Studio to find every Tutors course in the folders I name
  So that I can see which are ready to borrow from and which need fixing first

  Scenarios drive the headless `library` command over temporary folders on disk, through the same use case the
  app's Library screen calls. The folders searched are only ever read.

  @stu-0261 @ears-event
  Rule: When a lecturer adds a library folder, the Studio shall list every Tutors course in it and in the folders below it, and check each with the course rules.

    Scenario: Two courses at different depths
      Given a library folder holding a new course "Web Development" at "web-dev" and a new course "Mobile Apps" at "2026/semester-2/mobile"
      When the lecturer searches the library
      Then the command shall print "Ready: Mobile Apps in 2026/semester-2/mobile (10 items)"
      And the command shall also print "Ready: Web Development in web-dev (10 items)"
      And the summary shall be "Found 2 courses: 2 ready, 0 to fix."

  @stu-0262 @ears-ubiquitous
  Rule: The Studio shall treat a folder holding a course.md as one course, and never as a folder of more courses.

    Scenario: A course with a copy of another course inside it
      Given a library folder holding a new course "Web Development" at "web-dev" and a new course "Old Copy" at "web-dev/old"
      When the lecturer searches the library
      Then the summary shall be "Found 1 course: 0 ready, 1 to fix."

  @stu-0263 @ears-state
  Rule: While a course in a library folder has an error finding, the Studio shall show it as needing fixes and lend none of its items to another course.

    Scenario: A course with no descriptor for its topic
      Given a library folder holding a new course "Web Development" at "web-dev" whose "unit-1/topic-01/topic.md" is missing
      When the lecturer searches the library for items
      Then the command shall print a line starting "Needs fixing: Web Development in web-dev"
      And the command shall list no items

  @stu-0264 @ears-ubiquitous
  Rule: The Studio shall change nothing in a library folder.

    Scenario: Searching leaves every file as it was
      Given a library folder holding a new course "Web Development" at "web-dev" whose "unit-1/topic-01/topic.md" is missing
      When the lecturer searches the library for items
      Then the library folder shall be as it was

  @stu-0265 @ears-unwanted
  Rule: If a library folder can't be read, then the Studio shall name it, say why, and still list the courses in the other folders.

    Scenario: One folder is gone
      Given a library folder holding a new course "Web Development" at "web-dev"
      When the lecturer searches the library and a folder that isn't there
      Then the command shall print a line starting "Couldn't search"
      And the summary shall be "Found 1 course: 1 ready, 0 to fix."
