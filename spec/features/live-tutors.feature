Feature: Watching a course take shape in Tutors on this computer
  As a lecturer writing a course
  I want to see it in Tutors itself, on my own computer, while I write it
  So that I see what students will see after every change, before anything is published

  Scenarios drive the headless `live` command with the real Node adapter: Node serves the built course,
  and `pnpm dev` runs in a copy of Tutors on disk whose reader is a stand-in that answers as the Tutors
  reader does. The generator is a stand-in that writes the course's title into tutors.json (ADR 0042).

  @stu-0164 @ears-unwanted
  Rule: If the folder a lecturer chooses as their copy of Tutors isn't the Tutors repository with its dependencies installed, then the Studio shall say what to do in that folder and start nothing.

    Scenario: A folder that isn't Tutors
      Given a course called "Web Development II"
      And a folder of notes, not a copy of Tutors
      When the lecturer shows the course live in that folder
      Then the command shall print "This folder isn't a copy of Tutors. Choose the folder you cloned tutors-sdk/tutors-mono-repo into: it holds apps/reader."
      And the course shall not have been built

    Scenario: Tutors cloned but not set up
      Given a course called "Web Development II"
      And a copy of Tutors with no dependencies installed
      When the lecturer shows the course live in that folder
      Then the command shall print "Tutors isn't set up in this folder yet. Open a terminal in it, run pnpm install, then choose it again."

  @stu-0165 @ears-event
  Rule: When a lecturer asks to see the course in Tutors on this computer, the Studio shall build the course, serve it on this computer only, start the reader from the lecturer's copy of Tutors unless one is already running, and show the course in it.

    Scenario: Tutors started from the lecturer's copy
      Given a course called "Web Development II"
      And a copy of Tutors
      When the lecturer shows the course live in that folder
      Then the command shall print "… Starting Tutors from your copy (the first time takes a minute or two)"
      And the link shall open the reader's course page on the course served on this computer
      And the reader shall have been started with no sign-in
      And the course served there shall be titled "Web Development II", for any page to fetch

    Scenario: Tutors already running
      Given a course called "Web Development II"
      And a copy of Tutors
      And the Tutors reader already running
      When the lecturer shows the course live in that folder
      Then the command shall print "… Tutors is already running: using it"
      And the link shall open the running reader's course page

  @stu-0166 @ears-state
  Rule: While a course is live in Tutors on this computer, the Studio shall rebuild it after each change and reload Tutors on the page it shows, rebuilding once more for changes made during a rebuild.

    Scenario: A new title shows in Tutors
      Given a course called "Web Development II" live in Tutors
      When the lecturer renames the course "Web Development 2"
      Then the course served there shall be titled "Web Development 2", for any page to fetch
      And the command shall print "Rebuilt: reload the page in Tutors to see it."

  @stu-0167 @ears-unwanted
  Rule: If a rebuild fails while a course is live, then the Studio shall keep the last build in Tutors and say why.

    Scenario: A change that doesn't build
      Given a course called "Web Development II" live in Tutors
      When the lecturer makes a change the generator can't build
      Then the command shall print "Tutors still shows the last build. The Tutors generator stopped before it finished building the course. The last lines it printed are below."
      And the course served there shall be titled "Web Development II", for any page to fetch

  @stu-0168 @ears-event
  Rule: When the lecturer stops the live course, leaves it or quits Studio, the Studio shall stop serving it and stop any reader Studio started.

    Scenario: Stopping
      Given a course called "Web Development II" live in Tutors
      When the lecturer stops the live course
      Then the command shall print "Stopped: Tutors on this computer no longer shows the course."
      And nothing shall answer at the course's address
      And nothing shall answer at the reader's address
