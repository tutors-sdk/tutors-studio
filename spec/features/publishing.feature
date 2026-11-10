Feature: Saving a course, as a website, or publishing it to Netlify
  As a lecturer who wants a compliant course, then to share it
  I want one button to save it, one to save it as a website, and one to publish it
  So that I never run the generator, a container or a deploy by hand

  Scenarios drive the headless `save`, `save-website` and `publish` commands with the real adapters: the
  Tutors generator build and Netlify's API, over a fake computer (which tools are installed, what each
  one does) and Netlify's API in memory (ADR 0019). The local preview is retired (ADR 0031).

  @stu-0023 @ears-event
  Rule: When a lecturer publishes a course to Netlify, the Studio shall build it with the Tutors generator, send only the files Netlify does not already hold, and give the tutors.dev link.

    Scenario: The first publish creates the site
      Given a course with no errors on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print "Published to Netlify: https://web-dev-2026.netlify.app (5 files sent)."
      And the command shall also print "Students read it at https://tutors.dev/course/web-dev-2026"
      And Netlify shall hold the site "web-dev-2026" with the headers file that lets the reader fetch it

    Scenario: Publishing again sends only what changed
      Given a course with no errors on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      And Netlify already holds every file but the course's tutors.json
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print "Published to Netlify: https://web-dev-2026.netlify.app (1 file sent)."

    Scenario: Docker builds the course when Deno is not installed
      Given a course with no errors on a computer with Docker but no Deno
      And the lecturer is signed in to Netlify
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print "Published to Netlify: https://web-dev-2026.netlify.app (5 files sent)."
      And the generator shall have run in the Deno container over the course folder

  @stu-0024 @ears-unwanted
  Rule: If a course has errors, then the Studio shall refuse to publish it and say how many to fix.

    Scenario: A course with a Week 3 folder of slides
      Given a course with a "Week 3" folder of slides on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print "Fix the 1 problem the course map shows before publishing, so students see the whole course."
      And the generator shall not have run

  @stu-0025 @ears-unwanted
  Rule: If Netlify refuses the access token, then the Studio shall publish nothing and say how to make a new token.

    Scenario: An expired token
      Given a course with no errors on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify with a token Netlify no longer accepts
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print a line saying "Make a new one in Netlify"
      And Netlify shall hold no site

  @stu-0112 @ears-event
  Rule: When a lecturer publishes a course, the Studio shall save it with the standard setup it lacks, check it, build it and put it online, all in that one press.

    Scenario: No publishing file
      Given a course with no publishing file on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print "Students read it at https://tutors.dev/course/web-dev-2026"
      And the course shall have its publishing file

  @stu-0113 @ears-ubiquitous
  Rule: The Studio shall remember the site each course was published as, so publishing it again is one press of Publish changes with the students' link beside it.

    Scenario: Published once, remembered after
      Given a course with no errors on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      When the lecturer publishes the course as "web-dev-2026"
      Then Studio shall remember "web-dev-2026" for this course
      And another course shall have no site yet

  @stu-0114 @ears-unwanted
  Rule: If no Netlify sign-in is kept, then the Studio shall send the lecturer to Settings to sign in instead of asking for a token on the publish screen.

    Scenario: Publishing before signing in
      Given a course with no errors on a computer with Deno but no Docker or Podman
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print a line saying "Sign in to Netlify first"
      And Netlify shall hold no site

  @stu-0115 @ears-event
  Rule: When a lecturer signs in to Netlify from Settings, the Studio shall open Netlify's own sign-in page in the browser and keep the token Netlify returns in the keychain.

    Scenario: Approving Studio on Netlify's page
      Given a copy of Studio with a Netlify client id
      When the lecturer signs in to Netlify and approves Studio in the browser
      Then the browser shall have opened Netlify's page for the ticket
      And the keychain shall hold the token Netlify returned

    Scenario: A copy with no client id
      Given a copy of Studio with no Netlify client id
      Then Settings shall ask for an access token instead

  @stu-0116 @ears-state
  Rule: While Advanced mode is off, the Studio shall leave the git hand-off and Save as a website out of the Check and Publish screens.

    @active
    Scenario: Advanced mode off
      Given Advanced mode is off
      Then the publish screen shall offer "Publish" and "Save the course" only
      And the check screen shall not offer the git hand-off

    @inactive
    Scenario: Advanced mode on
      Given Advanced mode is on
      Then the publish screen shall also offer "Save as a website…"
      And the check screen shall offer the git hand-off

  @stu-0087 @ears-event
  Rule: When a lecturer saves a course as a website, the Studio shall build it with tutors-lite and save the web pages as a new folder in the folder the lecturer chose, never over a folder already there.

    Scenario: Saving the website twice
      Given a course with no errors on a computer with Deno but no Docker or Podman
      When the lecturer saves the course as a website in "/home/lecturer/Desktop"
      Then the command shall print "Saved the course as a website in /home/lecturer/Desktop/web-dev-website. Open /home/lecturer/Desktop/web-dev-website/index.html in any browser."
      And "/home/lecturer/Desktop/web-dev-website" shall hold the course's pages and its slides
      When the lecturer saves the course as a website in "/home/lecturer/Desktop" again
      Then the command shall then print "Saved the course as a website in /home/lecturer/Desktop/web-dev-website-2. Open /home/lecturer/Desktop/web-dev-website-2/index.html in any browser."
      And the first website shall be as it was

  @stu-0088 @ears-unwanted
  Rule: If a course has errors, then the Studio shall refuse to save it as a website and say how many to fix.

    Scenario: A course with a Week 3 folder of slides
      Given a course with a "Week 3" folder of slides on a computer with Deno but no Docker or Podman
      When the lecturer saves the course as a website in "/home/lecturer/Desktop"
      Then the command shall print "Fix the 1 problem the course map shows before publishing, so students see the whole course."
      And the generator shall not have run
      And nothing shall have been saved

  @stu-0089 @ears-event
  Rule: When a lecturer saves a course from Publish, the Studio shall confirm it passes the Tutors rules and add the standard setup it lacks in the course's own folder, without building it or sending it anywhere.

    Scenario: A course with no publishing file, on a computer with neither Deno nor containers
      Given a course with no publishing file on a computer with no Deno, Docker or Podman
      When the lecturer saves the course
      Then the command shall print "Added the standard setup: netlify.toml, .gitignore."
      And the command shall also print "The course passes the Tutors rules and has the setup Tutors expects. It is saved in its own folder, ready to publish to Netlify whenever you like."
      And the course shall now have a netlify.toml that publishes the json folder
      And nothing shall have been run on the computer
      And Netlify shall hold no site

    Scenario: Saving a course that already has its setup
      Given a course with no errors on a computer with Deno but no Docker or Podman
      When the lecturer saves the course
      Then the command shall print "The course passes the Tutors rules and has the setup Tutors expects. It is saved in its own folder, ready to publish to Netlify whenever you like."
      And the course shall be as it was, with the json folder left out of git

  @stu-0090 @ears-unwanted
  Rule: If a course has errors when the lecturer saves it, then the Studio shall change nothing and say how many to fix.

    Scenario: A course with a Week 3 folder of slides
      Given a course with a "Week 3" folder of slides and no publishing file on a computer with Deno but no Docker or Podman
      When the lecturer saves the course
      Then the command shall print "Fix the 1 problem the course map shows before saving, so the course is complete."
      And the course shall still have no publishing file

  @stu-0117 @ears-event
  Rule: When a lecturer saves or publishes a course and the Studio carries a Tutors command line that validates, the Studio shall run its `tutors validate --format json` as the last check before changing anything.

    Scenario: The command line checks a course before it is saved
      Given a course with no publishing file on a computer with Deno but no Docker or Podman
      And the Studio carries the Tutors command line "jsr:@tutors/tutors@6.0.0"
      When the lecturer saves the course
      Then the computer shall have run "deno run -A --node-modules-dir=none jsr:@tutors/tutors@6.0.0 validate . --format json"
      And the command shall print a line saying "passes the Tutors rules"

    Scenario: No command line that validates yet
      Given a course with no errors on a computer with Deno but no Docker or Podman
      When the lecturer saves the course
      Then nothing shall have been run on the computer

  @stu-0118 @ears-unwanted
  Rule: If the Tutors command line reports an error the course map missed, then the Studio shall change nothing, put nothing online and show the command line's own words.

    Scenario: The command line finds a problem
      Given a course with no errors on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      And the Studio carries the Tutors command line "jsr:@tutors/tutors@6.0.0"
      And the command line reports the error "A new rule this course breaks." on "topic-01"
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print a line saying "The Tutors command line found 1 problem to fix first"
      And the command shall print a line saying "topic-01: A new rule this course breaks."
      And Netlify shall hold no site

    Scenario: The command line can't check the course
      Given a course with no publishing file on a computer with Deno but no Docker or Podman
      And the Studio carries the Tutors command line "jsr:@tutors/tutors@6.0.0"
      And the command line answers with something other than a report
      When the lecturer saves the course
      Then the command shall print a line saying "couldn't check the course"
      And the course shall still have no publishing file
