Feature: The Tutors inside Studio
  As a lecturer who installs Studio and nothing else
  I want the reader, the generator and the rules inside it to be one tested Tutors release
  So that what Studio previews, builds and checks is what Tutors does, and an update moves them together

  tutors-bundle.json at the root of the repository names the Tutors release, the generator, tutors-lite
  and Deno, and lists each file the build downloads with its SHA-256 (ADR 0043). `pnpm bundle pins`
  writes src/domain/bundle.ts, src-tauri/src/bundle.rs and the tools program (tools/main.ts) from it; `pnpm bundle fetch` downloads the parts.

  @stu-0171 @ears-ubiquitous
  Rule: The Studio shall build and check courses with the Tutors generator, tutors-lite and Deno that tutors-bundle.json names, and no other.

    Scenario: The pins are the manifest's
      Given the manifest in the repository
      Then the pins written from it are the ones in the repository
      And Studio builds with "jsr:" and the manifest's generator
      And Studio builds websites with "jsr:" and the manifest's tutors-lite

    Scenario: A changed manifest makes the pins stale
      Given a copy of the repository whose manifest names generator "@tutors/tutors@5.4.0"
      When the pins are checked
      Then the check names "src/domain/bundle.ts", "src-tauri/src/bundle.rs" and "tools/main.ts"

    Scenario: A manifest that names no version is refused
      Given a manifest whose generator is "@tutors/tutors"
      When it is read
      Then it is refused with "must be a JSR package at a version"

  @stu-0172 @ears-unwanted
  Rule: If a part of the bundle downloaded for a Studio build does not have the SHA-256 that tutors-bundle.json gives for it, then the Studio shall fail the build and name the part.

    Scenario: A part that changed after it was pinned
      Given a manifest with a part "reader" pinned to the SHA-256 of "the reader we tested"
      And the download now answers "a reader nobody tested"
      When the parts are fetched
      Then the build fails naming "reader"
      And no file is written for it

    Scenario: The part that was pinned
      Given a manifest with a part "reader" pinned to the SHA-256 of "the reader we tested"
      And the download now answers "the reader we tested"
      When the parts are fetched
      Then the part's file holds "the reader we tested"

  @stu-0173 @ears-ubiquitous
  Rule: The Studio shall say in Settings which Tutors release is inside it.

    Scenario: Studio 0.1.0 with Tutors 17.1.0
      Given Studio 0.1.0 built from a manifest naming Tutors "17.1.0"
      When the lecturer opens Settings
      Then Studio shall say "This is Studio 0.1.0, with Tutors 17.1.0 inside."

  @stu-0209 @ears-ubiquitous
  Rule: The Studio's Tutors tools shall be compiled from a tutors-mono-repo checkout at the commit that tutors-bundle.json names, and from no other.

    Scenario: The tools program takes Tutors from the checkout
      Given the manifest in the repository
      Then the tools program imports "@tutors/tutors" and "@tutors/tutors-lite", which the checkout's workspace answers
      And the tools program's version names the manifest's commit

    Scenario: A checkout at another commit is refused
      Given a tutors-mono-repo checkout at a commit the manifest does not name
      When the tools are compiled from it
      Then it is refused with "but tutors-bundle.json builds Tutors from"

  @stu-0220 @ears-event
  Rule: When tutors-mono-repo publishes a release newer than the one tutors-bundle.json names, the manifest bot shall open a pull request that moves the manifest and its pins to that release.

    Scenario: Tutors 17.2.0 is released
      Given the manifest in the repository names Tutors "17.1.0"
      When tutors-mono-repo releases "v17.2.0" at commit "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" with the generator and tutors-lite at "5.4.0"
      Then the manifest names Tutors "17.2.0", built from that commit
      And the pins name "@tutors/tutors@5.4.0" and "@tutors/tutors-lite@5.4.0"

    Scenario: Nothing newer
      Given the manifest in the repository names Tutors "17.1.0"
      When tutors-mono-repo releases "v17.1.0" at commit "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" with the generator and tutors-lite at "5.3.0"
      Then the manifest is left as it is

  @stu-0221 @ears-state
  Rule: While tutors.dev runs a newer Tutors release than the one inside Studio, the Studio shall say so beside the preview.

    Scenario: Production is ahead
      Given Studio with Tutors "17.1.0" inside
      When tutors.dev answers that it runs Tutors "17.2.0"
      Then Studio says "tutors.dev runs Tutors 17.2.0, newer than the Tutors 17.1.0 inside Studio, so a page here can look a little different from what students see. A newer Studio will catch up."

    Scenario: Production is the same release
      Given Studio with Tutors "17.1.0" inside
      When tutors.dev answers that it runs Tutors "17.1.0"
      Then Studio says nothing about it

    Scenario: Production can't be asked
      Given Studio with Tutors "17.1.0" inside
      When tutors.dev can't be asked
      Then Studio says nothing about it

  @stu-0313 @ears-event
  Rule: When a developer runs `pnpm tauri dev` and the Tutors reader inside Studio is missing or built from another commit than tutors-bundle.json pins, the build shall say so and offer to build it.

    Scenario: No reader built yet
      Given a Studio checkout with no reader built
      Then the dev command shall say "The Tutors reader inside Studio isn't built"

    Scenario: A reader built from another commit
      Given a Studio checkout whose reader was built from another commit
      Then the dev command shall say "built from another Tutors commit"

    Scenario: The reader at the pinned commit
      Given a Studio checkout whose reader was built at the pinned commit
      Then the dev command shall say nothing about the reader


  @stu-0321 @ears-event
  Rule: When a Tutors release names itself in a tutors-release.json, the manifest bot shall move tutors-bundle.json to that release's versions, its commit, and its reader file with that file's SHA-256.

    Scenario: Tutors 17.2.0 carries its reader
      Given the manifest in the repository names Tutors "17.1.0"
      When Tutors "17.2.0" is released with a tutors-release.json naming its reader file "tutors-reader-static-17.2.0.tar.gz"
      Then the manifest names Tutors "17.2.0", its packages, its Deno and its commit
      And the manifest's reader part is that file, with its SHA-256

    Scenario: A prerelease is left for testers
      Given the manifest in the repository names Tutors "17.1.0"
      When a candidate "17.2.0-rc.1" is released with a tutors-release.json
      Then the manifest is left as it is

    Scenario: A release manifest in a shape Studio doesn't read
      When a tutors-release.json of schema 2 is read
      Then it is refused with "schema 2 is not one this Studio reads"

  @stu-0322 @ears-state
  Rule: While tutors-bundle.json names a reader file from a Tutors release, the Studio build shall install the reader inside Studio from that file, building nothing.

    Scenario: The reader comes from the release
      Given a Studio checkout whose manifest names a Tutors release's reader file
      When the reader is installed
      Then the reader inside Studio is that file's reader, stamped with the release's commit

  @stu-0323 @ears-unwanted
  Rule: If the reader file of a Tutors release does not have the SHA-256 that tutors-bundle.json gives for it, then the Studio build shall refuse it, name it, and leave the reader inside Studio as it was.

    Scenario: A reader file that was changed
      Given a Studio checkout whose manifest names a Tutors release's reader file
      And the file served is not the one released
      When the reader is installed
      Then it is refused with "reader"
      And the reader inside Studio is as it was

  @stu-0324 @ears-unwanted
  Rule: If this computer's Node is older than the Node a tutors-mono-repo checkout names in its package.json, then `pnpm bundle reader` shall say which Node Tutors needs and which this computer has, and build nothing.

    Scenario: Node 24 where Tutors needs Node 26.13
      Given a tutors-mono-repo checkout that needs Node ">=26.13.0"
      When the reader is built on a computer with Node "v24.19.0"
      Then the build says "Tutors needs Node 26.13.0 or later to build its reader, and this computer has Node 24.19.0. Install Node 26"

    Scenario: Node new enough
      Given a tutors-mono-repo checkout that needs Node ">=26.13.0"
      When the reader is built on a computer with Node "v26.14.1"
      Then the build says nothing about Node
