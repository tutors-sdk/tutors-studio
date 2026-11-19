Feature: An agent working on a course
  As a technical lecturer
  I want Claude Code or another agent to read my course, propose changes and apply the ones I accept
  So that I can script a course without giving an agent more than I could do myself

  Studio is an MCP server (ADRs 0007, 0051). Scenarios connect an MCP client to `pnpm headless <course> mcp`'s
  server in memory, over a course in memory. "Studio has the course open" is the window's side of ADR 0052,
  through the same use case the app calls, with the waiting plans in memory.

  Background:
    Given a course with a talk folder named "talk-01 Intro"

  @stu-0202 @ears-ubiquitous
  Rule: The Studio shall expose no tool that writes a file other than plan_apply.

    Scenario: Proposing changes nothing
      Given the lecturer lets an assistant on this computer work on the course
      When the agent lists Studio's tools
      Then every tool but plan_apply reads or proposes
      When the agent proposes every safe fix
      Then the course is unchanged
      When the agent applies the plan it was given
      Then "topic-01/talk-01-intro/talk.md" is in the course

  @stu-0203 @ears-unwanted
  Rule: If an agent applies a plan that no propose tool made in the same session, or one already applied, then the Studio shall refuse it and change nothing.

    Scenario: A made-up plan and a plan applied twice
      Given the lecturer lets an assistant on this computer work on the course
      When the agent applies a plan called "plan-99"
      Then Studio refuses with "Studio has no plan with that id from this session. Propose the change again, then apply the new plan."
      And the course is unchanged
      When the agent proposes every safe fix and applies it twice
      Then the second apply is refused

  @stu-0204 @ears-state
  Rule: While "Let an assistant on this computer work on this course" is off, the Studio shall refuse every tool call for that course.

    Scenario: Not allowed on this computer
      Given the lecturer hasn't let an assistant work on the course
      When the agent asks for the course map
      Then Studio refuses because the lecturer hasn't allowed it
      When the lecturer turns it on and the agent asks again
      Then the agent gets the course map

  @stu-0205 @ears-event
  Rule: When an assistant applies a plan while Studio has the course open, the Studio shall show the plan on Check and publish and change nothing until the lecturer accepts it.

    Scenario: The plan waits for the lecturer, who accepts it
      Given the lecturer lets an assistant on this computer work on the course
      And Studio has the course open
      When the agent proposes every safe fix
      And the agent applies the plan it was given
      Then the agent is told the plan waits for the lecturer
      And the course is unchanged
      And Check and publish shows the assistant's plan
      When the lecturer accepts it
      Then "topic-01/talk-01-intro/talk.md" is in the course
      And no plan from the assistant is waiting

  @stu-0206 @ears-event
  Rule: When the lecturer turns down an assistant's plan, the Studio shall discard it and change nothing.

    Scenario: The lecturer turns the plan down
      Given the lecturer lets an assistant on this computer work on the course
      And Studio has the course open
      When the agent proposes every safe fix and applies it
      And the lecturer turns it down
      Then the course is unchanged
      And no plan from the assistant is waiting

