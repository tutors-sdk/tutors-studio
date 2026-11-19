Feature: What the design review changed
  As a lecturer
  I want each screen to tell me the truth about my course and never lose my words
  So that I can trust what Studio shows and says

  The first design review of every screen is in docs/design-review/README.md.

  @stu-0215 @ears-state
  Rule: While a course has no errors, the Studio shall say under its title how many weeks are still to write, and lead with Check and publish only once a week is written and no other screen's next action is showing.

    Scenario: A new course with nothing written
      Given a course with no errors and 8 weeks, none written
      Then the line under its title says "Everything checks out. 8 of 8 weeks still to write."
      And Check and publish does not lead

    Scenario: A course with a week written
      Given a course with no errors and 8 weeks, 1 written
      Then the line under its title says "Everything checks out. 7 of 8 weeks still to write."
      And Check and publish leads

    Scenario: A course with errors
      Given a course with 2 errors and 8 weeks, 8 written
      Then the line under its title says "2 things to fix before publishing"
      And Check and publish does not lead

  @stu-0216 @ears-event
  Rule: When the lecturer closes an editor with words not yet saved, the Studio shall ask whether to save them first, close without saving, or keep writing.

    Scenario: Closing with unsaved words
      Given the lecturer has changed a page and not saved it
      When the lecturer closes the editor
      Then Studio asks "Your changes to this page aren't saved yet."

    Scenario: Closing with everything saved
      Given the lecturer has saved every change to a page
      When the lecturer closes the editor
      Then the editor closes without asking

  @stu-0217 @ears-event
  Rule: When the lecturer adds a quiz to a week, the quiz designer shall name the week by the title students see, never by its folder.

    Scenario: A new quiz in week 2
      Given the week "topic-02-javascript-arrays" titled "2: Javascript Arrays"
      When the lecturer adds a quiz to it
      Then the quiz designer says the quiz is in "2: Javascript Arrays"

  @stu-0218 @ears-state
  Rule: While a week is hidden from students, its page shall say so and offer only to show it again.

    Scenario: A hidden week
      Given a course whose properties.yaml hides "topic-02"
      Then Studio reads "topic-02" as hidden from students
      And Studio reads "topic-01" as seen by students

  @stu-0219 @ears-event
  Rule: When the lecturer opens Settings, an editor, the quiz designer, Check and publish or Changes, the companion shall put away what it was saying.

    Scenario: Opening an editor while the helper speaks
      Given the companion is saying "Your weeks are ready. Choose one and drop your slides onto it."
      When the lecturer opens another screen
      Then the companion says nothing
