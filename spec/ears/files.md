# Files in a course

Where a lecturer's files go, as `docs/course-files.md` lays out: a file belongs to the learning object that shows it. A PDF that is the material is its own card; a file a note or a lab step links to lives in that note's or lab's `archives/` folder (ADR 0040).

| Id       | Pattern    | Requirement                                                                                                                                                                       |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0155 | event      | When a lecturer adds a file Tutors doesn't publish, such as a Word document, as a note, the Studio shall put it, zipped, in the note's archives folder and link it from the note. |
| STU-0156 | event      | When a lecturer adds a lab that holds files beside its steps, the Studio shall put each file other than a picture in the lab's archives folder and point the steps' links at it.  |
| STU-0157 | event      | When a lecturer makes a folder that holds a PDF into a lab, the Studio shall move the PDF into the lab's archives folder, so students still see the lab's steps.                  |
| STU-0158 | event      | When a lecturer attaches a file while writing a note or a lab step, the Studio shall link it where they are writing and save it, with the page, in that page's archives folder.   |
| STU-0159 | unwanted   | If a lecturer attaches a file to a page that is not a note or a lab step, then the Studio shall attach nothing and say to drop the file on the week as its own card.              |
| STU-0160 | event      | When a lecturer attaches a file Tutors doesn't publish, the Studio shall save it zipped, so students can download it.                                                             |
| STU-0161 | ubiquitous | The Studio shall write the extension of every file it places in lower case, so Tutors publishes it.                                                                               |
