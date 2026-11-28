Feature: Guided building
  As a lecturer making my first Tutors course
  I want each item to ask for the material it takes, and a track through the course to follow
  So that I can build the course one step at a time, or leave the track and shape it myself

  Uploads are planned like every other change (ADR 0004) and whatever they replace goes to the bin. The
  guide reads the course itself, so it picks up where the lecturer left it (ADR 0071). Scenarios drive the
  AuthoringPort over a course made from the lecturer's answers, in memory.

  @stu-0341 @ears-ubiquitous
  Rule: The Studio shall offer on each talk, tutorial, lab, reading and archive an upload button that names what that item takes.

    Scenario: Each item names what it takes
      Then a "talk" offers "Upload your slides (PDF)" for PDFs only
      And a "tutorial" also offers "Upload the problem sheet (PDF)" for PDFs only
      And a "lab" offers "Upload your lab content" for several files
      And a "note" also offers "Upload your reading" for several files
      And a "archive" offers "Upload the download (zip)" for one file
      And a "topic" offers no upload
      And a "web" offers no upload either

  @stu-0342 @ears-event
  Rule: When a lecturer uploads a PDF to a talk or a tutorial, the Studio shall put it in that item and move the slides it showed before to the bin.

    Scenario: Slides uploaded to a new course's lecture
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer uploads "Week 1 Slides.PDF" to the lecture of week 1
      Then the plan shall write "Week-1-Slides.pdf" into the lecture of week 1
      And the plan shall move the starter deck "talk.marp" to the bin
      When the lecturer accepts the plan
      Then the lecture of week 1 shall have its material
      And the course shall have no errors

    Scenario: New slides replace the old ones
      Given a new course of 2 weeks, each with a lecture and a lab
      And the lecturer has uploaded "old.pdf" to the lecture of week 1
      When the lecturer uploads "new.pdf" to the lecture of week 1
      Then the plan shall write "new.pdf" into the lecture of week 1
      And the plan shall move "old.pdf" to the bin

  @stu-0343 @ears-unwanted
  Rule: If a lecturer uploads anything but one PDF to a talk or a tutorial, then the Studio shall upload nothing and say what to upload instead.

    Scenario: A PowerPoint file
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer uploads "Slides.pptx" to the lecture of week 1
      Then nothing is planned, and Studio says "Slides.pptx" isn't a PDF and to save the slides as a PDF

    Scenario: Two PDFs at once
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer uploads "a.pdf" and "b.pdf" to the lecture of week 1
      Then nothing is planned, and Studio says "Choose one PDF. A talk shows one set of slides; to show another deck, add another lecture to the week."

  @stu-0344 @ears-event
  Rule: When a lecturer uploads content to a lab, the Studio shall make each Markdown page a step, in the order of their names and in place of steps that still hold starter text, and keep every other file where the steps' links find it.

    Scenario: A lab's pages, a picture and a handout
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer uploads "01 Setup.md" linking "handout.pdf" and "grid.png", "02 Grid.md", "handout.pdf" and "grid.png" to the lab of week 1
      Then the lab of week 1 shall get the steps "01.Setup.md" and "02.Grid.md"
      And the plan shall move the lab's starting steps to the bin
      And the plan shall write "archives/handout.pdf" into the lab of week 1
      And the plan shall also write "grid.png" into the lab of week 1
      And the step "01.Setup.md" shall link "archives/handout.pdf" and "grid.png"
      When the lecturer accepts the plan
      Then the lab of week 1 shall have its material
      And the course shall have no errors

    Scenario: More pages after the lecturer's own steps
      Given a new course of 2 weeks, each with a lecture and a lab
      And the lecturer has uploaded "Setup.md" to the lab of week 1
      When the lecturer uploads "Extras.md" to the lab of week 1
      Then the lab of week 1 shall get the steps "02.Extras.md"
      And the plan shall move nothing to the bin

  @stu-0345 @ears-event
  Rule: When a lecturer uploads to a reading, the Studio shall make a Markdown page the reading and attach every other file with a link from it.

    Scenario: A reading page and a Word handout
      Given a course with a week holding a reading "Background"
      When the lecturer uploads "reading.md" and "Brief.docx" to the reading
      Then the reading's page shall hold the uploaded text under its card's icon
      And the plan shall write "archives/Brief.docx.zip" into the reading
      And the reading's page shall link "archives/Brief.docx.zip"
      When the lecturer accepts the plan
      Then the reading shall have its material

  @stu-0346 @ears-unwanted
  Rule: If a lecturer uploads a page to a reading they have already written, then the Studio shall upload nothing and say why.

    Scenario: A reading already written
      Given a course with a week holding a reading "Background" the lecturer has written
      When the lecturer uploads "reading.md" to the reading
      Then nothing is planned, and Studio says "This reading already has your writing, so Studio won't write over it. Open it to change it, or upload a PDF or Word file to attach to it."

  @stu-0347 @ears-event
  Rule: When a lecturer uploads a file to an archive, the Studio shall make it the archive's download, zipped when it is not a zip.

    Scenario: Starter code that is a zip
      Given a course with a week holding an archive "Starter code"
      When the lecturer uploads "starter.zip" to the archive
      Then the plan shall write "starter.zip" into the archive

    Scenario: A spreadsheet, zipped for download
      Given a course with a week holding an archive "Starter code"
      When the lecturer uploads "marks.ods" to the archive
      Then the plan shall write "marks.ods.zip" into the archive

  @stu-0348 @ears-optional
  Rule: Where a lecturer asks to be guided when making a new course, the Studio shall open the course at the guide's first step.

    Scenario: A new course starts the guide at week 1
      Given a new course of 2 weeks, each with a lecture and a lab
      When the guide starts
      Then the guide is at "What is week 1 about?"
      And the guide has 6 steps to do and 0 done

  @stu-0349 @ears-ubiquitous
  Rule: The Studio's guide shall take the lecturer through each week in order, naming the week and then adding material to each of its items, and end with a check of the course.

    Scenario: The track through a two-week course
      Given a new course of 2 weeks, each with a lecture and a lab
      Then the guide's steps are "What is week 1 about?, Week 1 lecture, Week 1 lab, What is week 2 about?, Week 2 lecture, Week 2 lab, Check your course"

  @stu-0350 @ears-event
  Rule: When a week has its own title or an item has its material, the Studio's guide shall count that step as done and go on to the next step not done.

    Scenario: Naming week 1 and uploading its slides
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer titles week 1 "Arrays and loops"
      And the lecturer uploads "slides.pdf" to the lecture of week 1 and accepts it
      And the guide starts
      Then the guide is at "Week 1 lab"
      And the guide has 6 steps to do and 2 done

  @stu-0351 @ears-event
  Rule: When a lecturer skips a step, the Studio's guide shall go on to the next step not done and list the skipped step as still to do at the end.

    Scenario: Skipping a lab
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer titles week 1 "Arrays and loops"
      And the lecturer uploads "slides.pdf" to the lecture of week 1 and accepts it
      And the guide starts
      And the lecturer skips the step
      Then the guide is at "What is week 2 about?"
      When the lecturer skips to the end
      Then the guide ends at "Check your course"
      And the steps still to do are "Week 1 lab, What is week 2 about?, Week 2 lecture, Week 2 lab"

  @stu-0352 @ears-event
  Rule: When a lecturer goes back to the guide on a course, the Studio shall start it at the first step not done.

    Scenario: A course half built
      Given a new course of 2 weeks, each with a lecture and a lab
      When the lecturer titles week 1 "Arrays and loops"
      And the lecturer also titles week 2 "Functions"
      And the guide starts
      Then the guide is at "Week 1 lecture"
