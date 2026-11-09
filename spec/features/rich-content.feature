Feature: Quizzes checked
  As a lecturer who writes quizzes
  I want Studio to tell me which questions the reader leaves out
  So that no question goes missing in front of my students

  Scenarios drive the headless `check` command over an in-memory course. The sentences come from
  @tutors/course-rules. Studio shows slides and diagrams as text and draws nothing (ADR 0031).

  @stu-0015 @ears-event
  Rule: When a lecturer opens a course with a quiz question the reader leaves out, the Studio shall name the question and say why it is left out.

    Scenario: A question with no right answer
      Given a course whose quiz has a second question with no right answer
      When the lecturer checks the course
      Then the command shall print a finding for "topic-01/quiz-01/quiz.md" that says 'Question 2 ("Which tag makes a link?")'
