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

  @stu-0179 @ears-event
  Rule: When Studio opens and a day has passed since it last asked for a newer version, the Studio shall ask for the latest version on the lecturer's channel and download nothing.

    Scenario: Opening a day after the last check
      Given Studio 0.1.0 last checked for a newer version "2026-11-17T09:00:00Z", with version "0.3.0" released
      When Studio opens at "2026-11-18T09:00:00Z"
      Then Studio shall have asked the "stable" channel once
      And nothing shall be downloaded or installed

    Scenario: Opening again the same day
      Given Studio 0.1.0 last checked for a newer version "2026-11-18T08:00:00Z", with version "0.3.0" released
      When Studio opens at "2026-11-18T09:00:00Z"
      Then Studio shall not have asked for a newer version

    Scenario: A lecturer on Beta
      Given Studio 0.1.0 on the Beta channel, with version "0.3.0" released and "0.4.0-beta.1" on Beta
      When Studio opens at "2026-11-18T09:00:00Z"
      Then Studio shall have asked the "beta" channel once
      And Studio shall say on opening "Studio 0.4.0-beta.1 is ready."

  @stu-0180 @ears-event
  Rule: When Studio opens and finds a newer version, the Studio shall say on the start screen and the course home which Studio and which Tutors it holds, with Update now and Later.

    Scenario: Studio 0.3.0 with Tutors 17.2.0
      Given Studio 0.1.0 never checked, with version "0.3.0" released holding Tutors "17.2.0"
      When Studio opens at "2026-11-18T09:00:00Z"
      Then Studio shall say on opening "Studio 0.3.0 is ready, with Tutors 17.2.0 inside."

  @stu-0181 @ears-state
  Rule: While a plan is being applied or a course is being saved or published, the Studio shall not install an update.

    Scenario: Update now pressed while the course is publishing
      Given Studio 0.1.0 never checked, with version "0.3.0" released holding Tutors "17.2.0"
      And Studio has opened at "2026-11-18T09:00:00Z"
      When the lecturer presses Update now while the course is publishing
      Then Studio shall say "Studio is saving or changing your course, so it installed nothing yet. Press Update now again once that has finished."
      And nothing shall be downloaded or installed

  @stu-0182 @ears-unwanted
  Rule: If an update's signature does not match the key in the app, then the Studio shall discard it, install nothing and say the update could not be checked.

    Scenario: A forged update
      Given Studio 0.1.0 never checked, with version "0.3.0" released holding Tutors "17.2.0"
      And the download's signature doesn't match the key in the app
      And Studio has opened at "2026-11-18T09:00:00Z"
      When the lecturer presses Update now
      Then Studio shall say "Studio couldn't check that this update came from Tutors, so it threw it away and installed nothing. Studio is as it was."
      And nothing shall be installed
      And pressing Update now again shall install nothing

  @stu-0183 @ears-optional
  Rule: Where the lecturer has turned on Keep Studio up to date, the Studio shall download a newer version in the background when it opens and install it when Studio closes.

    Scenario: Kept up to date
      Given Studio 0.1.0 never checked, with version "0.3.0" released holding Tutors "17.2.0"
      And the lecturer has turned on Keep Studio up to date
      When Studio opens at "2026-11-18T09:00:00Z"
      Then version "0.3.0" shall be downloaded and not yet installed
      When Studio closes
      Then version "0.3.0" shall be installed without restarting

    Scenario: Off, as it starts
      Given Studio 0.1.0 never checked, with version "0.3.0" released holding Tutors "17.2.0"
      When Studio opens at "2026-11-18T09:00:00Z"
      And Studio closes
      Then nothing shall be downloaded or installed

