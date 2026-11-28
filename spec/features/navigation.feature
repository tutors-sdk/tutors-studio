Feature: Getting around
  As a lecturer several screens deep in Studio
  I want Back and Home wherever I am
  So that I never get stuck in a sub-screen

  Scenarios drive the same Back and Home the app's bar calls, over the screens open on top of the start screen.

  @stu-0325 @ears-ubiquitous
  Rule: The Studio shall show Back, which closes the screen on top as its own Close would, and Home, which returns to the start screen, on every screen.

    Scenario: Back from Settings over Check in a course
      Given a course is open with a week chosen, Check open, and Settings open over it
      When the lecturer presses Back
      Then only Settings is closed

    Scenario: Back, one screen at a time, to the start screen
      Given a course is open with a week chosen, Check open, and Settings open over it
      When the lecturer presses Back 4 times
      Then the start screen shows and Back can go no further

    Scenario: Home from anywhere
      Given a course is open with a week chosen, Check open, and Settings open over it
      When the lecturer presses Home
      Then the start screen shows and Back can go no further

  @stu-0326 @ears-ubiquitous
  Rule: The Studio's Tutors window shall show Back, one page back, and Home, the Tutors reader's home page, on every page.

    Scenario: Every page of the Tutors window starts with the bar
      Given the script every page of the Tutors window starts with
      Then it adds Back, which goes one page back, and Home, the reader's home page

  @stu-0335 @ears-ubiquitous
  Rule: The Studio shall offer Your library on every screen.

    Scenario: The bar at the top of every screen
      Given the bar at the top of every screen, with a library
      Then it shall offer "Your library"

  @stu-0336 @ears-event
  Rule: When the lecturer closes the Studio's own window, the Studio shall quit, closing the Tutors window and stopping every course server and reader it started.

    Scenario: Closing Studio's window
      Given how the Studio's desktop side hears a window close
      Then closing the Studio's own window quits the Studio
      And quitting stops the course server, the reader and the library courses it serves
