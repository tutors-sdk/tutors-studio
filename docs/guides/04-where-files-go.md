# 4. Where your files go

In Tutors, every file belongs to the thing that shows it to students. There's no course-wide "files" folder. A PDF is either a card of its own or a download inside a page, and Tutors only publishes it if it's in the right place. Studio puts each file in that place for you, so this guide is about what students will get and how you choose.

The full standard, with the folder layout and the reasons read from Tutors' code, is [Where files go in a Tutors course](../course-files.md) ([ADR 0040](../adr/0040-files-belong-to-what-shows-them.md)). That page is the authority. This guide is the lecturer's version.

## The rule of thumb

> **Drop a file on a week and it becomes its own card. Attach it while writing a page and it becomes a download in the text.**

The same PDF can be either. Only you know which you mean, so Studio reads it from where you put it.

## The places a file can go

| What the file is for                                                    | How you add it in Studio                                      | What students see                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| **It is the material**: slides, a reading, a recorded deck              | Drop the PDF on a week                                        | Its own lecture card, opening the PDF               |
| **It supports a reading or a lab**: a handout, data, a template, a spec | **Attach a file** while writing that reading or lab step      | A download link in the text, where you put it       |
| **A bundle to download**: starter code, a project template              | Drop a zip on a week                                          | A download card                                     |
| **For the whole module**: handbook, assessment brief, reading list      | The same, in the **Module** section beside the weeks          | A card or link in the Module panel                  |
| **A picture a page shows**                                              | **Picture** while writing, or **Add a picture** on a lab step | The picture, in the text                            |
| **Your working files**: the PowerPoint a PDF came from, a spreadsheet   | Drop it on a week                                             | Nothing. Studio keeps it, and Tutors never shows it |

## Attach a file

While writing a **reading** (a note) or a **lab step**, press **Attach a file** in the formatting bar, or drop a file into the page. Studio puts a download link in the text where your cursor is, and saves the file with the page in that page's attachments. Both are one change, and one **Put it back** undoes them together.

Other pages (a week's own page, the course's page) can't hold attachments, because Tutors would leave them out. Studio attaches nothing there and tells you to drop the file on the week as its own card instead.

## What Studio does to every file for you

- **Zips what Tutors doesn't publish.** Word, PowerPoint, Keynote and OpenDocument files never reach the published course. Studio stores them in a zip (`brief.docx.zip`) so students can still download them. A Word file dropped on a week becomes a reading that links the zip.
- **Keeps labs as labs.** A PDF sitting loose beside a lab's steps would make Tutors show the PDF instead of the steps. Studio puts every file that would land beside a lab's steps (other than pages and pictures) into the lab's attachments, and points the steps' links at it. It does this when you drop a lab folder, when you **Load a course**, and when you make a folder into a lab.
- **Lower-case extensions.** Tutors skips `Slides.PDF` but publishes `Slides.pdf`, so Studio writes extensions in lower case.
- **Clean names.** An attachment's name has no spaces (`Week 1 Reading.pdf` becomes `Week-1-Reading.pdf`) and never replaces a file already there (`data-2.csv`).

## What Tutors never publishes

- **Word, PowerPoint and Keynote files**, unless they're zipped. Export slides to PDF for students to see them. The PowerPoint can stay beside the PDF, where students never see it.
- **A folder whose name doesn't say what it is**, such as `files/`, `pdfs/` or `resources/` at the top of the course, along with every file in it. Studio flags it as **Won't be published**.
- **A second PDF in one lecture.** Tutors shows only the first. Make each PDF its own lecture.

## If you work with the folders yourself (Advanced mode)

- A lecture (`talk-NN`) holds one PDF. A download (`archive-NN`) holds one zip.
- In a reading or lab, link attachments as `archives/name.pdf` and pictures as `img/name.png`. Those are the only relative links the Tutors reader fixes up for the published site. A link like `../talk-01/slides.pdf` breaks once the course is online.
- A week's `files/` folder is for working files. Course-rules accepts it and Tutors never shows it.
- Course-rules doesn't yet check links to files (only to pictures). Three checks are proposed upstream; see [Not yet checked by course-rules](../course-files.md#not-yet-checked-by-course-rules).

## Next

[Writing pages](05-writing-pages.md)
