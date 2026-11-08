Feature: Designing a quiz without markdown
  As a lecturer who wants a quick check on each week
  I want to type questions and tick the right answers
  So that I never write the quiz markdown the reader reads

  Scenarios drive the headless `quiz`, `add-quiz` and `save-quiz` commands over an in-memory course,
  with the same course-rules quiz writer and reader the app uses. Every sentence about a quiz comes from
  @tutors/course-rules.

  @stu-0016 @ears-event
  Rule: When a lecturer saves a new quiz in a topic, the Studio shall add one new quiz folder to that topic whose page the reader shows with the questions and right answers chosen.

    Scenario: A two-question quiz with a code snippet and a true or false question
      Given a course with one topic and no quizzes
      When the lecturer adds the quiz "HTTP basics" to "topic-01" with a code question and a true or false question
      Then the command shall print "Done: Add a quiz with 2 questions as topic-01/quiz-http-basics."
      And the course shall check out
      And opening "topic-01/quiz-http-basics" shall show "2. HTTP is stateless."
      And the answer marked right in that question shall be "True"

    Scenario: A quiz whose name is taken goes in a numbered folder
      Given a course whose topic already has the quiz folder "quiz-http-basics"
      When the lecturer adds the quiz "HTTP basics" to "topic-01" with a code question and a true or false question
      Then the command shall print "Done: Add a quiz with 2 questions as topic-01/quiz-http-basics-2."
      And the page "topic-01/quiz-http-basics/quiz.md" shall be unchanged

  @stu-0017 @ears-unwanted
  Rule: If a quiz in the designer can't be saved so the reader shows it as typed, then the Studio shall change nothing and give the course-rules sentence for the question at fault.

    Scenario: A question with only one answer
      Given a course with one topic and no quizzes
      When the lecturer adds a quiz to "topic-01" whose second question has one answer
      Then the command shall print "Question 2: add at least two answers to choose from."
      And the topic "topic-01" shall hold no quiz folder

  @stu-0018 @ears-event
  Rule: When a lecturer opens a quiz, the Studio shall show its title, time limit, questions, answers and right answers without any markdown.

    Scenario: A timed quiz opens as questions and ticked answers
      Given a course with a 30-second quiz "Week one check" whose first question asks "Which tag makes a link?"
      When the lecturer opens the quiz in "topic-01/quiz-01"
      Then the designer shall show the title "Week one check"
      And the designer shall show "30 seconds per question"
      And the designer shall show the first question "Which tag makes a link?" with the answer "<a>" marked right

  @stu-0019 @ears-event
  Rule: When a lecturer saves changes to a quiz they opened, the Studio shall rewrite only that quiz's page and keep its title and introduction.

    Scenario: Adding a question to an existing quiz
      Given a course with a 30-second quiz "Week one check" whose first question asks "Which tag makes a link?"
      When the lecturer opens "topic-01/quiz-01", adds the question "Which tag makes a paragraph?" and saves it
      Then the command shall print "Done: Save the quiz's 2 questions to topic-01/quiz-01/quiz.md."
      And the page "topic-01/quiz-01/quiz.md" shall still start with "# Week one check" and "Try these before the lab."
      And no other file shall change

  @stu-0020 @ears-unwanted
  Rule: If a quiz page holds a question the reader leaves out, then the Studio shall name that question when the quiz opens, before saving removes it.

    Scenario: A question with no right answer marked
      Given a course whose quiz has a second question "Pick a colour" with no right answer
      When the lecturer opens the quiz in "topic-01/quiz-01"
      Then the command shall say it leaves out question 2 "Pick a colour"
