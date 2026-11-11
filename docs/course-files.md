# Where files go in a Tutors course

This is Studio's standard for every file a lecturer adds: slides, handouts, starter code, Word documents, data. Studio follows it when it places a file, and anything that writes a course for Studio follows it too. It is decided in [ADR 0040](adr/0040-files-belong-to-what-shows-them.md) and specified by STU-0155 to STU-0161 (`spec/ears/files.md`).

## The rule

**A file belongs to the learning object that shows it.** Tutors has no course-wide files folder. The generator only publishes files that sit under a folder of a kind it knows, and the reader only resolves a link from a page to a file in that page's own `img/`, `archives/` or `archive/` folder. So a file is always part of something, and what it is for decides which:

| What the file is for                                                 | Where it lives                                     | What students see                                          |
| -------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| It **is** the material: slides, a reading, a recorded deck           | its own folder: `talk-NN/` (one PDF)               | its own card, opened in the PDF viewer                     |
| A problem sheet or exercise set, shown as a PDF                      | its own folder: `tutorial-NN/` (one PDF)           | its own card, opened in the PDF viewer                     |
| It **supports** a note or a lab: a handout, data, a template, a spec | that note's or lab's `archives/` folder            | a download link in the text, where the page links it       |
| Something to download as a bundle: starter code, a project template  | its own folder: `archive-NN/` (one zip)            | its own card, a download button                            |
| It is for the whole module: handbook, assessment brief, reading list | the side unit `side/`, by the same rules           | the Module panel, as a card or a link in the handbook note |
| A source a PDF was made from (`.pptx`, `.key`), or a working file    | beside its PDF in the talk, or the week's `files/` | nothing: Tutors never publishes these types                |
| A picture a page shows                                               | the page's `img/` folder                           | the picture, in the text                                   |

The reference course does exactly this. Its Talks hold one PDF each (`topic-01-typical/unit-1/talk-1-intro/introduction.pdf`), its Tutorial holds its problem sheet (`unit-2/tutorial-1/problem-sheet-1.pdf`), its labs and notes link downloads as `[Solutions](./archives/archive.zip)` and `[data.csv](./archives/data.csv)`, and its Archives hold one zip. Of the 146 PDFs in edeleastar's three modules and the reference course, 136 are in a Talk; none is at the course root.

## Card or link: how a lecturer chooses

The same PDF can be a card or a link, and only the lecturer knows which they mean. Studio reads it from **where they put it**:

- **Dropped on a week** (or the course, or chosen with "Choose material"): the file becomes its own card. A PDF is a Talk, a zip an Archive, a Markdown or Word file a Note, a link file a Web link (STU-0027, STU-0147).
- **Attached while writing a note or a lab step** ("Attach a file", or dropped into the page): the file goes in that page's `archives/` folder and a link to it goes in the text where the lecturer is writing (STU-0158). It is saved with the page, as one change that one "Put it back" undoes.
- **Attached to any other page** (a week's or the course's own page): Studio attaches nothing and says to drop the file on the week as its own card (STU-0159). An `archives/` folder there would be a folder Tutors leaves out.

## What Studio does to every file it places

- **Lower-case extensions.** The generator compares extensions as written: `Slides.PDF` is not published and its Talk shows no slides. Studio writes `Slides.pdf` (STU-0161).
- **Zip what Tutors doesn't publish.** Word, PowerPoint, Keynote and OpenDocument files never reach the site. Studio stores them in a zip (`brief.docx.zip`), the way edeleastar's modules already ship `template.docx.zip` (STU-0155, STU-0160). The zip stores the file as it is; Word files are already compressed.
- **Nothing loose in a lab.** A lab without `img/main.*` takes the first PDF beside its steps as the lab itself, and the reader shows that PDF instead of the steps. Studio puts every file other than a page or a picture that would land beside a lab's steps in the lab's `archives/` folder, and points the steps' links at it: on a drop, on loading a folder of material, and when a folder is made into a lab (STU-0156, STU-0157).
- **Clean names.** An attachment's name is ASCII with no spaces (`Week 1 Reading.pdf` becomes `Week-1-Reading.pdf`), and never replaces a file already there (`data-2.csv`).

## Never

- **A folder of no kind at the course root** (`files/`, `pdfs/`, `resources/`). The generator drops it before copying assets, so nothing in it reaches the site.
- **A link out of the page's folder** (`../talk-01/slides.pdf`), or to a file beside the page (`slides.pdf`). The reader leaves it as written and it resolves against the reader's own address. Link the Talk's card, or attach a copy.
- **Two PDFs in one Talk.** Tutors shows only the first (course-rules V004 says so).
- **A course-wide files folder of Studio's own.** It would need a new kind in the generator, the reader and course-rules, and it would break the property that moving a week moves everything it needs.

## The layout

```
web-dev-2/
├── course.md
├── side/                                  the whole module
│   ├── side.md
│   ├── note-01-handbook/
│   │   ├── note.md                        links archives/handbook.pdf
│   │   └── archives/handbook.pdf
│   └── talk-01-introduction/
│       ├── talk.md
│       ├── intro.pdf                      the slides students see
│       └── intro.pptx                     the source, never published
├── topic-03-arrays/
│   ├── topic.md
│   ├── talk-01-arrays/                    talk.md, arrays.pdf
│   ├── tutorial-01-sheet/                 tutorial.md, problem-sheet.pdf
│   ├── note-01-reading/
│   │   ├── note.md                        links archives/brief.docx.zip
│   │   └── archives/brief.docx.zip        a Word file, zipped
│   ├── lab-01-arrays/
│   │   ├── 01.Setup.md                    links archives/handout.pdf, archives/data.csv
│   │   ├── 02.Loops.md                    shows img/loop.png
│   │   ├── img/loop.png
│   │   └── archives/handout.pdf, data.csv, solution.zip
│   ├── archive-01-starter/                archive.md, starter.zip
│   └── files/                             working files, not shown (course-rules V018)
└── files/                                 NEVER: dropped by the generator, with everything in it
```

## Not yet checked by course-rules

course-rules checks the folder half of this (V002, V004, V018) but not links to files. Three checks belong upstream in `@tutors/course-rules`, each with a fix, and Studio will show them in the rules' own words once they exist:

1. A link from a page to a file resolves inside the course, sits under `img/`, `archives/` or `archive/`, and is a type Tutors publishes. Fix: move the file into the page's `archives/` and relink it.
2. An Archive holds one zip. Fix: zip the file it holds.
3. A lab with steps and no `img/main` holds no loose PDF. Fix: move the PDF into `archives/`.

Studio's own placement (above) means Studio never creates these problems; the checks are for courses made by hand. The Word-file note layout lives in `tutors-create`'s `itemLayout` (vendored); Studio corrects it after layout until the same change lands upstream.

## Where this comes from in Tutors' code

- Generator: `packages/jsr/gen/src/services/resource-builder.ts` (`getLoType`, `pruneTree`, `copyAssetFiles`) and `course-builder.ts` (`buildTalk`, `buildLab`, `buildArchive`), `utils/lr-utils.ts` (`getPdf`, `getArchiveFile`).
- Published types: `packages/jsr/model/src/types/media-types.ts` (`assetTypes`).
- Link rewriting: `packages/jsr/model/src/utils/markdown-utils.ts` (`filter`).
- Reader lab page: `apps/reader/src/routes/(course-reader)/lab/[courseid]/[...loid]/+page.svelte` (shows `lab.pdf` instead of the steps when it is set).
