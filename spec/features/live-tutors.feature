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

  @stu-0169 @ears-state
  Rule: While a live course is being rebuilt, the Studio shall say that Tutors is updating, in Studio and over the course in the Tutors window, until Tutors shows the change or says it didn't build.

    Scenario: Updating, then up to date
      Given a course called "Web Development II" live in Tutors
      When the lecturer renames the course "Web Development 2"
      Then the command shall print "… Studio is updating this course…" before it rebuilds
      And the course served there shall be titled "Web Development 2", for any page to fetch

    Scenario: Updating, then a change that didn't build
      Given a course called "Web Development II" live in Tutors
      When the lecturer makes a change the generator can't build
      Then the command shall print "… This change didn't build. You're seeing the last version: Studio says why."

  @stu-0170 @ears-event
  Rule: When a rebuild of a live course finishes, the Studio shall say that Tutors is up to date and how long the rebuild took.

    Scenario: Up to date, and how long it took
      Given a course called "Web Development II" live in Tutors
      When the lecturer renames the course "Web Development 2"
      Then the command shall say Tutors is up to date and how many seconds the rebuild took

  @stu-0176 @ears-event
  Rule: When a lecturer asks to see the course in Tutors and has chosen no copy of Tutors of their own, the Studio shall build the course and show it in the Tutors reader inside Studio, served on this computer only.

    Scenario: The Tutors inside Studio
      Given a course called "Web Development II"
      And the Tutors reader inside Studio
      When the lecturer shows the course live with no copy of Tutors named
      Then the command shall print "… Opening the Tutors inside Studio"
      And the link shall open the reader inside Studio on 127.0.0.1, on the course served on this computer
      And the course served there shall be titled "Web Development II", for any page to fetch

  @stu-0177 @ears-ubiquitous
  Rule: The Studio shall serve the Tutors reader inside it on 127.0.0.1 only, to GET and HEAD only, answering its own page for any path that names no file and sending its content security policy.

    Scenario: What the reader inside Studio answers
      Given a course called "Web Development II" live in the Tutors inside Studio
      Then the reader shall answer the course's page with its own page and its content security policy
      And the reader shall refuse a POST
      And the reader shall answer a path that leaves its folder with its own page, not the file

  @stu-0178 @ears-unwanted
  Rule: If a lecturer asks to see the course in the Tutors inside Studio and this copy of Studio carries no Tutors reader, then the Studio shall show nothing and say to install Studio again.

    Scenario: A copy without the reader
      Given a course called "Web Development II"
      And a copy of Studio without the Tutors reader
      When the lecturer shows the course live with no copy of Tutors named
      Then the command shall print "This copy of Studio is missing the Tutors reader, so it can't show the course. Download Studio again from the release page and install it over this one; your courses and settings stay as they are."

  @stu-0309 @ears-state
  Rule: While Advanced mode is off, the Studio shall show a course in the Tutors inside Studio and never ask for a copy of Tutors of the lecturer's own, even one chosen before.

    Scenario: A copy chosen before is set aside
      Given a course called "Web Development II"
      And the Tutors reader inside Studio
      And a copy of Tutors chosen before Advanced mode was turned off
      When the lecturer shows the course live
      Then the course shall show in the Tutors inside Studio

    Scenario: A copy of Studio without the reader
      Given a course called "Web Development II"
      And a copy of Studio without the Tutors reader
      When the lecturer shows the course live
      Then Studio shall say "Download Studio again" and not ask for a copy of Tutors

  @stu-0310 @ears-optional
  Rule: Where Advanced mode is on, the Studio shall let the lecturer show a course in their own copy of Tutors, such as a developer checkout, instead of the Tutors inside Studio.

    Scenario: A developer checkout
      Given a course called "Web Development II"
      And the Tutors reader inside Studio
      And a copy of Tutors chosen in Advanced mode
      When the lecturer shows the course live
      Then the course shall show in the lecturer's own copy of Tutors

  @stu-0311 @ears-event
  Rule: When the lecturer asks to view Tutors locally, the Studio shall open the Tutors reader's home page in the Tutors window, served on this computer only, building no course.

    Scenario: Tutors' own home page
      Given the Tutors reader inside Studio
      When the lecturer views Tutors locally
      Then the Tutors window shall show the reader's home page on 127.0.0.1
      And no course shall have been built

  @stu-0312 @ears-event
  Rule: When the lecturer asks to view their course in Tutors from the course's contents, the Studio shall build the course and show it in the Tutors window, live from then on.

    Scenario: From the contents
      Given a course called "Web Development II"
      And the Tutors reader inside Studio
      When the lecturer views their course in Tutors from its contents
      Then the Tutors window shall show the course
      And the course shall be live in Tutors
