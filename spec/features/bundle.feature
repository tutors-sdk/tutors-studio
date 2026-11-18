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
      And the tools program is written from the manifest's generator and tutors-lite

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
