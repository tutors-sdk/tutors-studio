Feature: Folder registries
  As a lecturer whose labs and lectures colleagues could use
  I want to share a ready course, or one item of it, into a folder registry under a licence
  So that anyone who adds that folder to their library can borrow from it, knowing where it came from

  Scenarios drive the headless `share`, `library` and `compose` commands over a library folder on disk, through
  the same use cases the Library screen's Share and Pick from it call. A registry is plain files in a folder.

  Background:
    Given a library folder holding a new course "Web Development" at "web-dev" and an empty folder "shared"

  @stu-0271 @ears-event
  Rule: When a lecturer shares a ready course, or one of its items, into a folder registry, the Studio shall show one plan that copies it into the registry as the next version of its entry, and write nothing until they accept it.

    Scenario: Sharing a whole course
      When the lecturer shares "web-dev" as "Leigh" under "CC-BY-4.0"
      Then the command shall print "Plan: Share Web Development to shared as leigh/web-development version 1, under CC-BY-4.0."
      And the command shall print "Shared as leigh/web-development version 1."
      And the course folder shall be as it was

    Scenario: Sharing again after a change makes the next version
      Given the lecturer shared "web-dev" as "Leigh" under "CC-BY-4.0"
      And the course at "web-dev" has a changed "unit-1/topic-01/topic.md"
      When the lecturer shares "web-dev" as "Leigh" under "CC-BY-4.0"
      Then the command shall print "Shared as leigh/web-development version 2."

  @stu-0272 @ears-unwanted
  Rule: If a lecturer shares without a licence, then the Studio shall share nothing and ask for one.

    Scenario: No licence
      When the lecturer shares "web-dev" as "Leigh" under ""
      Then the command shall print "licence: Choose a licence. Studio shares nothing without one, so others know how they may use it."
      And the registry folder shall be empty

  @stu-0273 @ears-ubiquitous
  Rule: The Studio shall store each shared folder in a registry once, under the SHA-256 digest of its files.

    Scenario: The same files under a second name
      Given the lecturer shared "web-dev" as "Leigh" under "CC-BY-4.0"
      When the lecturer shares "web-dev" as "Leigh" under "CC-BY-4.0" named "web-dev-again"
      Then the command shall print "3 of 3 folders are already in the registry, so they are stored once."
      And the registry shall hold 3 stored folders

  @stu-0274 @ears-ubiquitous
  Rule: The Studio shall leave out of every share the files a course keeps to itself: hidden files, Tutors' build output, the term's dates, student lists and hosting settings.

    Scenario: The term's dates, the student list and the hosting settings stay behind
      Given the course at "web-dev" also holds "calendar.yaml", "enrollment.yaml" and ".env"
      When the lecturer shares "web-dev" as "Leigh" under "CC-BY-4.0"
      Then the command shall print "Left out, because a course keeps them to itself: calendar.yaml, enrollment.yaml, netlify.toml."
      And no stored folder shall hold "calendar.yaml", "enrollment.yaml", ".env" or "netlify.toml"

  @stu-0275 @ears-event
  Rule: When a library folder holds a folder registry, the Studio shall list each of its entries at its latest version, with its licence, ready to pick from.

    Scenario: A registry in the library
      Given the lecturer shared "web-dev" as "Leigh" under "CC-BY-4.0"
      When the lecturer lists the library
      Then the command shall print "Shared: Web Development as leigh/web-development version 1, CC-BY-4.0 (10 items)"

  @stu-0276 @ears-unwanted
  Rule: If the files of something picked from a registry no longer match the digest they were shared under, then the Studio shall copy nothing and say it has changed since it was shared.

    Scenario: A stored lab was changed by hand
      Given the lecturer shared the item "unit-1/topic-01/lab-01" of "web-dev" as "Leigh" under "CC-BY-4.0"
      And someone changed a file stored for it
      When the lecturer composes "Mixed" from "shared/index/leigh/week-1-lab:unit-1/topic-01/lab-01@1"
      Then the command shall print "picks: Week 1 lab in leigh/week-1-lab has changed since it was shared: its files no longer match what was shared, so Studio won't copy it."
      And no course shall have been made

  @stu-0277 @ears-unwanted
  Rule: If a lecturer shares from a course that needs fixing, then the Studio shall share nothing and say the course needs fixing first.

    Scenario: A course with a problem
      Given the course at "web-dev" has lost "unit-1/topic-01/topic.md"
      When the lecturer shares "web-dev" as "Leigh" under "CC-BY-4.0"
      Then the command shall print "course: Web Development needs fixing before it can be shared."
      And the registry folder shall be empty

  @stu-0278 @ears-ubiquitous
  Rule: The Studio shall name, on the Borrowed material page, the registry entry, version and licence of every item copied from a registry.

    Scenario: Borrowing a shared lab
      Given the lecturer shared the item "unit-1/topic-01/lab-01" of "web-dev" as "Leigh" under "CC-BY-4.0"
      When the lecturer composes "Mixed" from "shared/index/leigh/week-1-lab:unit-1/topic-01/lab-01@1"
      Then the Borrowed material page shall list "| Week 1 lab | Web Development (leigh/week-1-lab version 1, CC-BY-4.0) |"
