Feature: Bundle journeys
  As a lecturer who installs Studio on a Windows laptop and nothing else
  I want to go from a new course to a saved, previewed course without installing anything more
  So that Studio works on the computer I have, in the folder I keep my modules in

  The design doc's bundle journeys (B5). Each scenario runs over the headless adapter in `pnpm test`,
  with the Tutors tools in memory. A Rule tagged @desktop also runs through the real window on
  Windows (`pnpm e2e:desktop`, ADR 0047), with the app built with the tools and the reader beside it,
  in a folder whose name has spaces and accents, as a OneDrive folder does.

  @stu-0184 @ears-event @desktop
  Rule: When a lecturer makes a new course on a computer with nothing but Studio installed, the Studio shall save it with the setup Tutors expects and build it with the Tutors tools inside Studio.

    Scenario: From a new course to the course in Tutors
      Given a computer with only Studio on it
      When the lecturer makes a new course "Web Development" from "Lecture and lab" in "Seán Ó Módúl - OneDrive"
      And the lecturer saves the course
      Then the course folder holds "netlify.toml"
      When the lecturer shows the course in Tutors
      Then Tutors shows "Web Development"
      And Studio ran no tool but the Tutors tools

  @stu-0185 @ears-event @desktop
  Rule: When a lecturer saves a course as a website on a computer with no network, the Studio shall build it with the Tutors tools inside Studio and save it as a folder of web pages.

    Scenario: A website saved with the network off
      Given a computer with only Studio on it
      And no network
      When the lecturer makes a new course "Web Development" from "Lecture and lab" in "Seán Ó Módúl - OneDrive"
      And the lecturer saves the course as a website in "Seán Ó Módúl - OneDrive"
      Then "Seán Ó Módúl - OneDrive/web-development-website" holds "index.html"
      And Studio ran no tool but the Tutors tools
