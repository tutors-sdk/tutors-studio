Feature: Course details and card pictures
  As a lecturer making the course my own
  I want to set its title, credits and dates, and choose the picture on each card
  So that students see my course, not the template's

  Scenarios drive the headless `details` and `picture` commands over an in-memory course. Each change is a
  plan applied as accepted (ADR 0004); a replaced picture goes to the bin (ADR 0032). Studio shows text and
  markdown only, so a picture is named, never drawn.

  @stu-0104 @ears-event
  Rule: When a lecturer changes the course's title or credits, the Studio shall show a plan that rewrites only the course page's title line and the credits line in properties.yaml.

    Scenario: A new title and credits
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer sets the details 'title=Web Development 2|credits=Leigh Griffin'
      Then the command shall print 'Done: Change the course details: call the course "Web Development 2", credit it to Leigh Griffin.'
      And "course.md" shall read "# Web Development 2\n\nWelcome.\n"
      And the properties shall read "icon:\n  type: fluent-color:book-open-lightbulb-24\ncredits: Leigh Griffin\n"

    Scenario: Nothing different
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer sets the details 'credits=Leigh'
      Then the command shall print "That is already how the course is."
      And the course shall be as it was

  @stu-0105 @ears-event
  Rule: When a lecturer gives the course a start date, the Studio shall show a plan that writes a calendar dating each week of the course from that day.

    Scenario: Teaching starts on 25 January
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer sets the details 'start=2027-01-25'
      Then the calendar shall date week 1 from "2027-01-25" and week 2 from "2027-02-01"
      And the details shall say the course starts on "2027-01-25"

    Scenario: Not a date
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer sets the details 'start=2027-02-30'
      Then the command shall print '"2027-02-30" is not a date. Give the day teaching starts, such as 2027-01-25.'

  @stu-0106 @ears-event
  Rule: When a lecturer chooses a picture for a card, the Studio shall show a plan that copies it into the item's folder, moves any earlier picture to the bin, and takes out an icon that would show instead.

    Scenario: A picture for week 1
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer chooses "My Diagram.PNG" as the picture for "topic-01"
      Then the course shall have "topic-01/my-diagram.png"
      And the bin shall hold "topic.png"
      And "topic-01/topic.md" shall read "# Week 1\n\nThe web.\n"

    Scenario: A picture for the course
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer chooses "logo.svg" as the picture for the course
      Then the course shall have "logo.svg"
      And "properties.yaml" shall read "credits: Leigh\n"

  @stu-0107 @ears-unwanted
  Rule: If a lecturer chooses a file that is not a picture for a card, then the Studio shall change nothing and name the kinds of file a card can show.

    Scenario: A PDF chosen as a picture
      Given a two-week course called "Web Development" by "Leigh"
      When the lecturer chooses "slides.pdf" as the picture for "topic-01"
      Then the command shall print '"slides.pdf" is not a picture a card can show. Choose a PNG, JPG, JPEG, GIF or SVG file.'
      And the course shall be as it was

  @stu-0108 @ears-ubiquitous
  Rule: The Studio shall name a card's picture by its file name and never draw it.

    Scenario: What each card shows
      Given a two-week course called "Web Development" by "Leigh"
      Then the card for "topic-01" shall show the picture "topic.png"
      And the card for "topic-02" shall show its icon
      And the card for "topic-02/talk-01-css" shall show the usual icon
