Feature: Engagement beside the week
  As a lecturer teaching the course
  I want to see how many students opened each week and how long they spent
  So that I know which weeks need another look, without seeing who did what

  Reading Tutors' time data waits on read access upstream (ADR 0050), so Studio binds the `none`
  adapter, which reads nothing. Scenarios drive `pnpm headless <course> engagement` over a course in
  memory, with `none` or with a stand-in for Tutors' time data.

  Background:
    Given a course with two weeks, "topic-01" and "topic-02"

  @stu-0200 @ears-state
  Rule: While no engagement adapter is bound, the Studio shall show no engagement figures and complete every journey.

    Scenario: Nothing reads engagement
      Given no engagement adapter is bound
      When the lecturer asks for engagement
      Then the command prints "No engagement figures: Studio isn't reading Tutors' time data for this course."
      When the lecturer fixes the course
      Then the course checks out

  @stu-0201 @ears-state
  Rule: While an engagement adapter has figures for a course, the Studio shall show beside each week how many students opened it and how long they spent, and no student's name.

    Scenario: Figures from Tutors' time data
      Given Tutors' time data says 42 students spent 135 minutes in "topic-01", naming "Seán Ó Módúl"
      And Tutors' time data has figures for "topic-09", which the course no longer has
      When the lecturer asks for engagement
      Then the command prints "topic-01: Opened by 42 students, 2 h 15 min in all"
      And nothing printed names a student or "topic-09"
