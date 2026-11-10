Feature: Usage counts
  As the person deciding what Studio does next
  I want lecturers who choose to, to count how often they use Studio's main actions
  So that the next phase rests on evidence, without anything about a course leaving the computer

  Scenarios drive authoring, the assistant's proposals and the Settings use case over a course and settings
  held in memory, with Claude answered in memory (ADR 0037).

  @stu-0140 @ears-optional
  Rule: Where a lecturer has turned on usage counts, the Studio shall count each publish, save, accepted change, Git hand-off and assistant draft or suggestion as a number by name on this computer.

    Scenario: A lab drafted and accepted is counted
      Given a course whose lab "Grid" already has a step, and Claude chosen to draft it
      And the lecturer has turned on usage counts
      When the lecturer asks Claude to draft the lab and accepts the plan
      Then Settings shall show 1 for "Lab drafts from the assistant"
      And Settings shall show 1 for "Changes accepted"
      And the settings shall hold numbers by name and nothing from the course

  @stu-0141 @ears-ubiquitous
  Rule: The Studio shall keep usage counts off until the lecturer turns them on, and count nothing while they are off.

    Scenario: Nothing counted before the lecturer turns counting on
      Given a course whose lab "Grid" already has a step, and Claude chosen to draft it
      When the lecturer asks Claude to draft the lab and accepts the plan
      Then usage counts shall be off
      And Settings shall show 0 for "Changes accepted"

  @stu-0142 @ears-event
  Rule: When a lecturer turns usage counts off, the Studio shall clear the counts it kept.

    Scenario: Turning counting off clears it
      Given a course whose lab "Grid" already has a step, and Claude chosen to draft it
      And the lecturer has turned on usage counts
      And the lecturer asks Claude to draft the lab and accepts the plan
      When the lecturer turns off usage counts
      Then Settings shall show 0 for "Changes accepted"
      And turning counting on again shall show 0 for "Lab drafts from the assistant"

  @stu-0143 @ears-event
  Rule: When a lecturer copies the usage counts, the Studio shall give only Studio's version and the counts by name, with no file names, course names or course content.

    Scenario: The copied counts
      Given a course whose lab "Grid" already has a step, and Claude chosen to draft it
      And the lecturer has turned on usage counts
      And the lecturer asks Claude to draft the lab and accepts the plan
      When the lecturer copies the usage counts
      Then the copy shall give Studio's version "0.1.0" and the counts by name
      And the copy shall hold no file name, course name or words from the course
