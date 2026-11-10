Feature: Arranging a course
  As a lecturer shaping my course
  I want to reorder, move, rename, hide and remove what I added, and see the plan first
  So that the course stays one Tutors accepts however I arrange it

  Scenarios drive the headless `arrange` command over an in-memory course. Every plan comes from
  course-rules' own rewiring planners (upstream feature 15), so Studio and `tutors rewire` agree, and is
  applied only as an accepted plan (ADR 0004). Removed items go to .tutors-bin (ADR 0032). The window
  does the same by dragging, with buttons for the keyboard.

  @stu-0095 @ears-event
  Rule: When a lecturer puts the items of one kind in a folder in a new order, the Studio shall show a plan that renumbers their folders in that order before anything moves.

    Scenario: Two lectures swapped
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "reorder topic-01 talk-02-css talk-01-html"
      Then the command shall print 'Plan: Put the talks in "Week 1" in a new order.'
      And the first week shall hold "talk-01-css" and "talk-02-html"

    Scenario: A new order put back
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "reorder topic-01 talk-02-css talk-01-html"
      And the lecturer puts back the latest change
      Then the command shall print 'Done: Put back: put the talks in "Week 1" in a new order.'
      And the course shall be as it was

  @stu-0096 @ears-event
  Rule: When a lecturer moves an item to another week, the Studio shall show a plan that moves it there with the next free number of its kind.

    Scenario: A lecture moved to week 2
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "move topic-01/talk-02-css topic-02"
      Then the command shall print 'Done: Move "CSS" to "Week 2".'
      And the course shall have "topic-02/talk-01-css/talk.md"

  @stu-0097 @ears-unwanted
  Rule: If a lecturer moves an item where Tutors does not show that kind, then the Studio shall change nothing and give course-rules' sentence for where it can go.

    Scenario: A week dropped into another week
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "move topic-02 topic-01"
      Then the command shall print "Tutors won't show a Topic inside a Topic. A Topic can go at the top of the course or in a Unit or in a Side unit."
      And the course shall be as it was

  @stu-0098 @ears-event
  Rule: When a lecturer gives an item a new title, the Studio shall show a plan that rewrites only the title line of the page its card takes its title from.

    Scenario: A lecture renamed
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "retitle topic-01/talk-01-html HTML basics"
      Then the command shall print 'Done: Rename "HTML" to "HTML basics".'
      And "topic-01/talk-01-html/talk.md" shall read "# HTML basics\n\nTags and elements.\n"

  @stu-0099 @ears-event
  Rule: When a lecturer hides a week from students, the Studio shall show a plan that adds the week to the course's ignore list in properties.yaml.

    Scenario: Week 2 hidden
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "hide topic-02"
      Then "properties.yaml" shall read "credits: Leigh\nignore:\n  - topic-02\n"

  @stu-0100 @ears-unwanted
  Rule: If a lecturer asks to hide an item inside a week, then the Studio shall change nothing and give course-rules' sentence for how to keep it from students.

    Scenario: Hiding a lecture
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "hide topic-01/talk-01-html"
      Then the command shall print "Tutors can hide only a whole topic or unit at the top of the course, not a Talk inside one. To keep it from students, remove it: it goes to the bin and can be put back."
      And the course shall be as it was

  @stu-0101 @ears-event
  Rule: When a lecturer removes an item, the Studio shall show a plan that moves it into the course's bin, which Tutors never publishes, and deletes nothing.

    Scenario: A lecture removed
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer arranges "remove topic-01/talk-02-css"
      Then the command shall print 'Done: Remove "CSS" to the bin.'
      And the course shall have ".tutors-bin/talk-02-css/talk.md"
      And checking the course shall find no talk "talk-02-css"

  @stu-0102 @ears-event
  Rule: When a lecturer drops an item on another, the Studio shall plan putting it in that item's place where both are of one kind in one folder, and otherwise moving it into the other.

    Scenario: The second lecture dropped on the first
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer drops "topic-01/talk-02-css" on "topic-01/talk-01-html" and accepts the plan
      Then the plan shall read 'Put the talks in "Week 1" in a new order'
      And "topic-01/talk-01-css/talk.md" shall read "# CSS\n"

    Scenario: A lecture dropped on week 2
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer drops "topic-01/talk-01-html" on "topic-02" and accepts the plan
      Then the plan shall read 'Move "HTML" to "Week 2"'
      And the course shall have "topic-02/talk-01-html/talk.md"

  @stu-0103 @ears-event
  Rule: When a lecturer moves an item earlier or later from the keyboard, the Studio shall plan swapping it with its neighbour of the same kind.

    Scenario: The first lecture moved later
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer moves "topic-01/talk-01-html" later and accepts the plan
      Then the plan shall read 'Put the talks in "Week 1" in a new order'
      And "topic-01/talk-02-html/talk.md" shall read "# HTML\n\nTags and elements.\n"

    Scenario: The last lecture cannot move later
      Given a course whose first week has the lectures "talk-01-html" and "talk-02-css"
      When the lecturer moves "topic-01/talk-02-css" later
      Then there shall be no plan
