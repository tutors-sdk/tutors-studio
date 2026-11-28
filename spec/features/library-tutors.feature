Feature: The library in Tutors
  As a lecturer with courses in my library folders
  I want to see them in Tutors on this computer, beside the courses I've read there
  So that I can look through them the way students will before I borrow from them

  Scenarios drive the use case the Library screen calls, over temporary library folders on disk, with the Node
  side's copies, builds and servers. The generator is stood in for by a build that writes the course's
  tutors.json, and Tutors' home page by the list the reader keeps.

  @stu-0316 @ears-event
  Rule: When the lecturer asks to show their library in Tutors, the Studio shall build each ready course kept in a library folder on this computer, serve each on this computer only, and list them on the Tutors reader's home page.

    Scenario: Two ready courses and one to fix
      Given a library holding ready courses "Web Development" and "Mobile Apps" and a course "Old Module" that needs fixing
      When the lecturer shows their library in Tutors
      Then Tutors' home page shall list "Web Development" and "Mobile Apps", each served on this computer
      And Tutors' home page shall not list "Old Module"

  @stu-0317 @ears-ubiquitous
  Rule: The Studio shall build a library course for Tutors from a copy in its own folder, changing nothing in the library folder.

    Scenario: The build lands in Studio's folder
      Given a library holding ready courses "Web Development" and "Mobile Apps" and a course "Old Module" that needs fixing
      When the lecturer shows their library in Tutors
      Then each course shall be built in Studio's own folder
      And the library folder shall be as it was

  @stu-0318 @ears-state
  Rule: While the Studio builds library courses for Tutors, the Studio shall show which course it is building out of how many, and let the lecturer stop.

    Scenario: Stopped after the first course
      Given a library holding ready courses "Web Development" and "Mobile Apps" and a course "Old Module" that needs fixing
      When the lecturer stops showing their library in Tutors once the first course is building
      Then Studio shall have said "Building 1 of 2: Mobile Apps"
      And the outcome shall be "You stopped Studio building your library. Tutors lists the 1 course built before then."

  @stu-0319 @ears-unwanted
  Rule: If a library course doesn't build for Tutors, then the Studio shall name it, say why, and still list the other courses in Tutors.

    Scenario: One course doesn't build
      Given a library holding ready courses "Web Development" and "Mobile Apps" and a course "Old Module" that needs fixing
      And the generator stops on "Mobile Apps"
      When the lecturer shows their library in Tutors
      Then the outcome shall be "Tutors lists 1 course from your library. 1 didn't build: each is named below."
      And "Mobile Apps" shall be named with why it didn't build
      And Tutors' home page shall list "Web Development"

  @stu-0320 @ears-event
  Rule: When the Studio lists the library in Tutors again, the Studio shall take off the reader's home page the library courses it listed before and no longer serves, and leave every other course there as it was.

    Scenario: A course taken out of the library
      Given a library holding ready courses "Web Development" and "Mobile Apps" and a course "Old Module" that needs fixing
      And Tutors' home page lists a course "Reference Course" the lecturer read
      When the lecturer shows their library in Tutors
      And "Mobile Apps" leaves the library and the lecturer shows their library in Tutors again
      Then Tutors' home page shall list "Reference Course" and "Web Development"
      And Tutors' home page shall not list "Mobile Apps"
