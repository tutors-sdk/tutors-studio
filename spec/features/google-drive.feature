Feature: Registries on Google Drive
  As a lecturer whose department keeps its teaching in a shared Google Drive
  I want Studio to search, share into and borrow from Drive folders
  So that colleagues anywhere can use a registry without a shared disk

  Scenarios drive the headless `library`, `share` and `compose` commands over the Drive adapter, which talks to
  Google Drive's HTTP API; here the API is a fake Drive in memory that answers the way Drive does.

  Background:
    Given a Google Drive folder "Teaching" holding a new course "Web Development" at "web-dev"

  @stu-0279 @ears-event
  Rule: When a lecturer adds a Google Drive folder to their library by its link, the Studio shall search it for courses and registries as it searches a folder on this computer.

    Scenario: Courses in a Drive folder
      When the lecturer lists the library "Teaching" in Google Drive
      Then the command shall print "Ready: Web Development in web-dev (10 items)"

  @stu-0280 @ears-ubiquitous
  Rule: The Studio shall share into, and borrow from, a registry in a Google Drive folder as it does a registry folder on this computer.

    Scenario: Sharing a lab into a Drive registry and borrowing it
      Given an empty Google Drive folder "Department registry"
      When the lecturer shares the item "unit-1/topic-01/lab-01" of "web-dev" into "Department registry" as "Leigh" under "CC-BY-4.0"
      Then the command shall print "Shared as leigh/week-1-lab version 1."
      When the lecturer composes "Mixed" from "index/leigh/week-1-lab:unit-1/topic-01/lab-01@1" in "Department registry"
      Then the command shall then print "Created mixed."

  @stu-0281 @ears-unwanted
  Rule: If the Studio is not signed in to Google Drive, or Google refuses its sign-in, then the Studio shall read nothing from Drive and say to sign in.

    Scenario: Not signed in
      Given Studio is not signed in to Google Drive
      When the lecturer lists the library "Teaching" in Google Drive
      Then the command shall print a line saying "signed in to Google Drive"

    Scenario: A token Google no longer accepts
      Given Studio's Google sign-in has been withdrawn
      When the lecturer lists the library "Teaching" in Google Drive
      Then the command shall print a line saying "sign in to Google Drive"

  @stu-0282 @ears-unwanted
  Rule: If what a lecturer pastes is not the link of a Google Drive folder, then the Studio shall add nothing and say how to copy one.

    Scenario: Something that isn't a folder link
      When the lecturer adds the Google Drive folder "my teaching folder"
      Then Studio shall say "Paste the link of a Google Drive folder: in Drive, Share, then Copy link."

  @stu-0283 @ears-ubiquitous
  Rule: The Studio shall write in Google Drive only into a folder that is a registry, or the registry.json that starts one.

    Scenario: A Drive folder that isn't a registry
      When Studio writes "items/x/lab.md" into "Teaching" in Google Drive
      Then the write shall be refused as "not a registry"
