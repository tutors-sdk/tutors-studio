Feature: The first five minutes
  As a lecturer opening Studio for the first time
  I want a course to try things on before I touch my own
  So that I learn how Studio works in a few minutes, with nothing of mine at risk

  The sample is a new course from the Web Development II reference course (ADR 0041): its weeks, units and
  titles, with no content. It goes where the lecturer chooses, like any new course, and is theirs to change.

  @stu-0210 @ears-state
  Rule: While the lecturer has no courses in Studio's list, the start screen shall offer to try Studio with a sample course.

    Scenario: A first run
      Given Studio's list of courses is empty
      Then the start screen shall offer "Try it with a sample course"

    Scenario: A lecturer with a course
      Given Studio's list holds 1 course
      Then the start screen shall not offer the sample course

  @stu-0211 @ears-event
  Rule: When the lecturer chooses to try the sample course, the Studio shall create a course shaped on Web Development II through an accepted plan, open it, and say that it is a sample whose changes touch none of the lecturer's own courses.

    Scenario: Trying the sample
      Given an empty place for the course
      When the lecturer tries the sample course
      Then a course called "Sample course" shall be created in the folder "sample-course"
      And it shall hold every week of Web Development II
      And it shall check with no errors
      And Studio shall say "This is a sample course to try Studio on. Change anything in it: your own courses are separate."

  @stu-0212 @ears-event
  Rule: When the start screen shows with no courses in Studio's list, the companion shall suggest trying the sample course first.

    Scenario: The first start screen
      When the start screen shows with no courses
      Then the companion shall say "New to Studio? Try the sample course first. Nothing you do there touches your own work."

  @stu-0213 @ears-event
  Rule: When the sample course opens, the companion shall say how to try adding material to a week.

    Scenario: The sample opens
      When the sample course opens
      Then the companion shall say "Open a week, then drag a file from your computer onto it to see where Studio puts it."

  @stu-0214 @ears-event
  Rule: When the lecturer starts a new course or loads one from the start screen, the companion shall put away its first-run suggestion.

    Scenario: Starting a new course on a first run
      Given the companion is suggesting the sample course
      When the lecturer leaves the start screen to start a course
      Then the companion shall say nothing

    Scenario: Other help stays
      Given the companion is saying "Your weeks are ready. Choose one and drop your slides onto it."
      When the lecturer leaves the start screen to start a course
      Then the companion shall still say it
