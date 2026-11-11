Feature: Files in a course
  As a lecturer with slides, handouts, starter code and Word documents
  I want each file to land where Tutors shows it
  So that students can open every file I add, from a card or from a link in the text

  docs/course-files.md is the standard: a PDF that is the material is its own card, and a file a note or
  a lab step links to lives in that note's or lab's archives/ folder, the one place the reader resolves
  such a link (ADR 0040). Scenarios drive the AuthoringPort and the load use case over a course in memory.

  @stu-0155 @ears-event
  Rule: When a lecturer adds a file Tutors doesn't publish, such as a Word document, as a note, the Studio shall put it, zipped, in the note's archives folder and link it from the note.

    Scenario: A Word document dropped on a week
      Given a course with a week "topic-01"
      When the lecturer drops "Assignment Brief.docx" on "topic-01"
      Then the plan shall write "topic-01/note-01/archives/Assignment-Brief.docx.zip"
      And "topic-01/note-01/archives/Assignment-Brief.docx.zip" shall be a zip holding "Assignment-Brief.docx"
      And "topic-01/note-01/note.md" shall link "archives/Assignment-Brief.docx.zip"
      And the plan shall write nothing else into "topic-01/note-01" but "note.md"
      When the lecturer accepts the plan
      Then the course shall have no errors

    Scenario: A Word document in a folder of material made into a course
      Given a folder of material holding "Week 1/Handbook.docx"
      When the lecturer makes it a course
      Then the plan shall write "topic-01/note-01/archives/Handbook.docx.zip"
      And "topic-01/note-01/note.md" shall link "archives/Handbook.docx.zip"

  @stu-0156 @ears-event
  Rule: When a lecturer adds a lab that holds files beside its steps, the Studio shall put each file other than a picture in the lab's archives folder and point the steps' links at it.

    Scenario: A lab folder with a handout and starter code beside its steps
      Given a course with a week "topic-01"
      When the lecturer drops a lab "Lab" whose "01 Setup.md" links "handout.pdf", with "handout.pdf", "starter.zip" and "diagram.png" beside it, on "topic-01"
      Then the plan shall write "topic-01/lab-01/archives/handout.pdf"
      And the plan shall also write "topic-01/lab-01/archives/starter.zip"
      And the picture shall stay at "topic-01/lab-01/diagram.png"
      And "topic-01/lab-01/01.Setup.md" shall link "archives/handout.pdf"
      And the plan shall write no PDF straight into "topic-01/lab-01"

  @stu-0157 @ears-event
  Rule: When a lecturer makes a folder that holds a PDF into a lab, the Studio shall move the PDF into the lab's archives folder, so students still see the lab's steps.

    Scenario: A folder of steps and a PDF made into a lab
      Given a course whose week "topic-01" holds a folder "practical" with "01.Setup.md" and "sheet.pdf"
      When the lecturer makes "topic-01/practical" a "Lab"
      Then the plan shall move "topic-01/practical/sheet.pdf" to "topic-01/practical/archives/sheet.pdf"

  @stu-0158 @ears-event
  Rule: When a lecturer attaches a file while writing a note or a lab step, the Studio shall link it where they are writing and save it, with the page, in that page's archives folder.

    Scenario: A PDF attached to a note
      Given a course whose note "topic-01/note-01/note.md" says "# Reading"
      When the lecturer attaches "Week 1 Reading.pdf" to "topic-01/note-01/note.md"
      Then the attachment shall be saved as "topic-01/note-01/archives/Week-1-Reading.pdf"
      And its link shall read "Week 1 Reading" and point at "archives/Week-1-Reading.pdf"
      And nothing shall have been written to the course
      When the lecturer saves the page with the link added and accepts the plan
      Then the course shall have "topic-01/note-01/archives/Week-1-Reading.pdf"
      And "topic-01/note-01/note.md" shall link "archives/Week-1-Reading.pdf"
      And the course shall have no errors

    Scenario: An attachment whose link was taken out again
      Given a course whose note "topic-01/note-01/note.md" says "# Reading"
      When the lecturer attaches "Week 1 Reading.pdf" to "topic-01/note-01/note.md"
      And the lecturer saves the page without the link
      Then the plan shall write only "topic-01/note-01/note.md"

    Scenario: Two files of the same name attached to a lab step
      Given a course whose lab "topic-01/lab-01" has a step "01.Setup.md" and already holds "archives/data.csv"
      When the lecturer attaches "data.csv" to "topic-01/lab-01/01.Setup.md"
      Then the attachment shall be saved as "topic-01/lab-01/archives/data-2.csv"

  @stu-0159 @ears-unwanted
  Rule: If a lecturer attaches a file to a page that is not a note or a lab step, then the Studio shall attach nothing and say to drop the file on the week as its own card.

    Scenario: A PDF attached to a week's page
      Given a course with a week "topic-01"
      When the lecturer attaches "Slides.pdf" to "topic-01/topic.md"
      Then Studio shall say "To show a PDF as its own card, drop it on the week instead."

  @stu-0160 @ears-event
  Rule: When a lecturer attaches a file Tutors doesn't publish, the Studio shall save it zipped, so students can download it.

    Scenario: A Word template attached to a lab step
      Given a course whose lab "topic-01/lab-01" has a step "01.Setup.md"
      When the lecturer attaches "Report Template.docx" to "topic-01/lab-01/01.Setup.md"
      Then the attachment shall be saved as "topic-01/lab-01/archives/Report-Template.docx.zip"
      And "topic-01/lab-01/archives/Report-Template.docx.zip" shall be a zip holding "Report-Template.docx"

  @stu-0161 @ears-ubiquitous
  Rule: The Studio shall write the extension of every file it places in lower case, so Tutors publishes it.

    Scenario: Slides saved with an upper-case extension
      Given a course with a week "topic-01"
      When the lecturer drops "Lecture 1.PDF" on "topic-01"
      Then the plan shall write "topic-01/talk-01/Lecture-1.pdf"
      When the lecturer accepts the plan
      Then the course shall have no errors
