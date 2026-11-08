Feature: Publishing a course to this computer or to Netlify
  As a lecturer who wants to see the course as students will, then share it
  I want one button to preview it here and one to publish it
  So that I never run the generator, a container or a deploy by hand

  Scenarios drive the headless `preview-here` and `publish` commands with the real adapters: the
  Tutors generator build, the container reader and Netlify's API, over a fake computer (which tools are
  installed, what each one does) and Netlify's API in memory (ADR 0019).

  @stu-0021 @ears-event
  Rule: When a lecturer previews a course on this computer, the Studio shall build it with the Tutors generator and show it in a Tutors reader running in a container on this computer.

    Scenario: Docker is installed and Deno is not
      Given a course with no errors on a computer with Docker but no Deno
      When the lecturer previews the course on this computer
      Then the command shall print "Your course is open in the Tutors reader on this computer: http://localhost:3000/course/localhost:8190"
      And the generator shall have run in the Deno container over the course folder
      And the course server shall serve the course's json folder read-only
      And the reader container shall run in anonymous mode

  @stu-0022 @ears-unwanted
  Rule: If neither Docker nor Podman is on the computer, then the Studio shall start nothing and say what to install.

    Scenario: Deno builds the course but nothing can run the reader
      Given a course with no errors on a computer with Deno but no Docker or Podman
      When the lecturer previews the course on this computer
      Then the command shall print a line saying "needs Docker or Podman. Install Docker Desktop"
      And no container shall have been started

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
