Feature: Checking a course and handing it off through git
  As a lecturer whose course lives in a GitHub repository that Netlify builds
  I want to fix what is safe in one go, then commit and push from the Studio
  So that publishing never needs a terminal

  Scenarios drive the headless `fix`, `push` and `ignore-build` commands with the real git adapter over
  a course in memory and a fake of the computer's git, which records every call (ADR 0021).

  @stu-0036 @ears-event
  Rule: When a lecturer asks to fix everything safe, the Studio shall offer one plan holding every fix the rules mark safe, with the deepest files and folders renamed first.

    Scenario: A file inside a folder that is also renamed
      Given a course with a folder named "Week 3" and a talk "topic-01/talk-01 Intro" holding "Week 1 Slides.pdf"
      When the lecturer asks to fix everything safe
      Then the plan shall rename "topic-01/talk-01 Intro/Week 1 Slides.pdf" before "topic-01/talk-01 Intro"
      And the course shall be unchanged
      When the lecturer fixes the course from the command line
      Then the command shall print "Fixed: Make the 3 safe fixes the course map suggests"
      And the course shall hold "topic-01/talk-01-intro/Week-1-Slides.pdf"
      And the course shall also hold "Week 3/topic.md"

  @stu-0037 @ears-event
  Rule: When a lecturer commits and pushes a course with no errors, the Studio shall add every change, commit it with the lecturer's message, and push the branch with the computer's git.

    Scenario: One changed page goes to GitHub
      Given a course with no errors in a git repository with one changed file
      When the lecturer pushes with the message "Week 3 slides"
      Then the command shall print "Committed and pushed main to origin."
      And git shall have run "add -A", then "commit -m Week 3 slides", then "push -u origin HEAD"

  @stu-0038 @ears-unwanted
  Rule: If the course's .gitignore does not leave out the generated json folder, then the Studio shall commit nothing and offer the plan that adds it.

    Scenario: The build folder would have been committed
      Given a course with no errors whose .gitignore does not mention json, in a git repository
      When the lecturer pushes with the message "Week 3 slides"
      Then the command shall print a line saying "doesn't leave out the generated json/ folder"
      And git shall have changed nothing
      When the lecturer accepts the plan that leaves json out of git
      Then the course's .gitignore shall keep its own lines and end with "json/"
      And a push with the message "Week 3 slides" shall now succeed

  @stu-0039 @ears-unwanted
  Rule: If a course has errors, then the Studio shall commit nothing and say how many to fix.

    Scenario: Week 3 would be missing
      Given a course with a folder named "Week 3" in a git repository
      When the lecturer pushes with the message "Week 3 slides"
      Then the command shall print "Fix the 1 problem the course map shows before publishing, so students see the whole course."
      And git shall have changed nothing

  @stu-0040 @ears-state
  Rule: While the course folder is not a git repository, the Studio shall commit nothing and say how to publish instead.

    Scenario: A course kept only on this computer
      Given a course with no errors in a folder that is not a git repository
      When the lecturer pushes with the message "Week 3 slides"
      Then the command shall print a line saying "Publish it to Netlify instead"
      And git shall have changed nothing

  @stu-0076 @ears-event
  Rule: When a lecturer with Advanced mode off sends a course's changes, the Studio shall apply one plan holding the standard setup the course lacks and then send them.

    Scenario: A course missing its publishing file and build rule
      Given a course with no errors, no publishing file and a .gitignore that does not mention json, in a git repository
      When Studio plans the setup for sending
      Then the plan shall add "netlify.toml" and ".gitignore"
      And the course shall be unchanged
      When the lecturer sends with the message "Week 3 slides"
      Then the course shall hold "netlify.toml"
      And the course's .gitignore shall keep its own lines and end with "json/"
      And git shall have run "add -A", then "commit -m Week 3 slides", then "push -u origin HEAD"

    Scenario: Nothing to add
      Given a course with no errors in a git repository with one changed file
      When Studio plans the setup for sending
      Then there shall be no plan

  @stu-0077 @ears-state
  Rule: While Advanced mode is off, the Studio shall not list a missing standard setup file as a problem.

    Scenario: The publishing file is missing and a week is not
      Given a course with no publishing file and a folder named "Week 3"
      Then the lecturer shall see the problem with "Week 3"
      And the lecturer shall not see the problem with "netlify.toml"
