Feature: Publishing a course to this computer, as a website, or to Netlify
  As a lecturer who wants to see the course as students will, then share it
  I want one button to preview it here, one to save it as a website, and one to publish it
  So that I never run the generator, a container or a deploy by hand

  Scenarios drive the headless `save`, `preview-here`, `save-website` and `publish` commands with the real adapters: the
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

  @stu-0078 @ears-event
  Rule: When a lecturer publishes a course that has no netlify.toml straight from Studio, the Studio shall publish it without adding that file.

    Scenario: No publishing file
      Given a course with no publishing file on a computer with Deno but no Docker or Podman
      And the lecturer is signed in to Netlify
      When the lecturer publishes the course as "web-dev-2026"
      Then the command shall print "Students read it at https://tutors.dev/course/web-dev-2026"
      And the course shall still have no publishing file

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
