Feature: Updating Studio
  As a lecturer who installed Studio once
  I want it to tell me when a newer version is out and install it when I say so
  So that I am never left on an old copy and never surprised by a change I didn't accept

  Scenarios drive the updates use case over an updates port in memory. In the app the port is Tauri's
  updater, reading the release's latest.json signed with the update key (ADR 0033); a build without
  the key has no updater.

  @stu-0109 @ears-event
  Rule: When a lecturer checks for a newer Studio and one is released, the Studio shall name its version and install nothing until the lecturer accepts.

    Scenario: Version 0.2.0 is out
      Given Studio 0.1.0 with version "0.2.0" released
      When the lecturer checks for a newer version
      Then Studio shall say "Studio 0.2.0 is ready. Studio downloads it, installs it and restarts; your courses and settings stay as they are."
      And nothing shall be installed

    Scenario: Already the newest
      Given Studio 0.1.0 with nothing newer released
      When the lecturer checks for a newer version
      Then Studio shall say "Studio 0.1.0 is the newest version."

  @stu-0110 @ears-unwanted
  Rule: If this copy of Studio carries no update key, then the Studio shall point the lecturer to the download page instead of offering an update.

    Scenario: A copy built without the key
      Given a copy of Studio that can't update itself
      When the lecturer checks for a newer version
      Then Studio shall link to "https://github.com/tutors-sdk/tutors-studio/releases/latest"
      And accepting shall install nothing

  @stu-0111 @ears-event
  Rule: When a lecturer accepts a newer Studio, the Studio shall download and install it, then restart.

    Scenario: Accepting 0.2.0
      Given Studio 0.1.0 with version "0.2.0" released
      When the lecturer checks for a newer version
      And the lecturer accepts it
      Then version "0.2.0" shall be installed and Studio restarted
