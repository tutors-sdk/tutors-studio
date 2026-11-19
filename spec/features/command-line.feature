Feature: The command line on this computer
  As a technical lecturer
  I want Studio's command line in any terminal, without a copy of Studio's source
  So that I can script my course, and give an assistant Studio's tools, from wherever I work

  The tools program the installer carries runs Studio's command line as `tutors-tools studio`, and Settings,
  Advanced, adds a `tutors-studio` command that runs it (ADR 0053). Scenarios bundle the command line as
  the tools program does and run it with Node over a course on disk; the Settings button is driven through
  its port, in memory.

  @stu-0207 @ears-ubiquitous
  Rule: The Studio shall carry its command line in the tools program, answering `studio <course folder> <command>` as pnpm headless answers `<course folder> <command>`.

    Scenario: The bundled command line checks a course
      Given a course on disk with a talk folder named "talk-01 Intro"
      When Studio's command line is bundled for the tools program
      And the lecturer runs it with "check"
      Then it answers as pnpm headless answers "check"

  @stu-0208 @ears-event
  Rule: When the lecturer presses "Add the command line to this computer", the Studio shall add a tutors-studio command for any terminal and say where it is and whether a terminal finds it.

    Scenario: Added where a terminal finds it
      Given this computer adds the command as "/home/l/.local/bin/tutors-studio", in a folder on its path
      When the lecturer adds the command line to this computer
      Then Studio says "Added. In a new terminal, type tutors-studio <course folder> check, or tutors-studio <course folder> mcp for an assistant. The command is /home/l/.local/bin/tutors-studio."

    Scenario: Added in a folder that isn't on the path
      Given this computer adds the command as "/home/l/.local/bin/tutors-studio", in a folder not on its path
      When the lecturer adds the command line to this computer
      Then Studio says "Added as /home/l/.local/bin/tutors-studio, but that folder isn't on this computer's path yet, so a terminal won't find tutors-studio by name. Add the folder to your PATH, or type the command's full name."

    Scenario: A copy of Studio without its command line
      Given this copy of Studio doesn't carry its command line
      When the lecturer adds the command line to this computer
      Then Studio says "This copy of Studio doesn't carry its command line. Install Studio from its installer to add it."
