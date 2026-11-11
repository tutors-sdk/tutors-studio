# Tutors Studio guides

These guides are for lecturers using Studio. Each one covers a single job and uses the words you see on screen. You don't need to know Git, markdown or how Tutors reads folders. Where a guide mentions a file or folder name, that detail is for people who have turned on **Advanced mode**, and you can skip it.

| Guide                                            | What it covers                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [1. Getting started](01-getting-started.md)      | Installing, the start screen, starting a new course, loading a course you already have   |
| [2. Finding your way around](02-course-map.md)   | The course home, the contents, what each label means, and fixing a "Won't be published"  |
| [3. Adding material](03-adding-material.md)      | Adding lectures, labs, readings and links by name, dropping files, the tray, My files    |
| [4. Where your files go](04-where-files-go.md)   | PDFs, slides, handouts and downloads: where Tutors needs each one and how Studio puts it |
| [5. Writing pages](05-writing-pages.md)          | Writing a page, tables, maths and code, lecture slides, lab steps, quizzes               |
| [6. Arranging a course](06-arranging.md)         | Reordering, moving, renaming, hiding, the bin, course details, card pictures             |
| [7. Undo and Changes](07-undo-and-changes.md)    | Seeing what Studio changed and putting any of it back                                    |
| [8. Check and publish](08-check-and-publish.md)  | Fixing problems, saving the course, publishing online, saving as a website, Git          |
| [9. The helper and assistants](09-assistant.md)  | The paper-note helper, choosing an assistant, what it can read, drafts and suggestions   |
| [10. Settings](10-settings.md)                   | Appearance, dyslexia mode, text size, contrast, Advanced mode, accounts, updates, counts |
| [11. Studio from a terminal](11-command-line.md) | `pnpm headless`: every journey without a window, for scripts and CI                      |
| [Questions and problems](troubleshooting.md)     | What to do when something doesn't work                                                   |

Installing Studio has its own page: [docs/install.md](../install.md). How Studio is built is in [docs/architecture.md](../architecture.md).

## Three things to know first

1. **Studio shows your course the way Tutors will publish it.** It runs the same rules as Tutors itself (`@tutors/course-rules`), so when Studio says students won't see something, they won't.
2. **Nothing changes until you say so.** Every change appears first under **Before anything changes**. Nothing is written until you press the button there. The one exception is dropping files on a week, which goes straight in and gives you **Put it back** (see [Adding material](03-adding-material.md)).
3. **Everything can be put back.** **Changes** lists every change Studio made since you opened the course. Anything removed goes to the course's bin, never deleted.

## About the pictures

The screenshots come from Studio's browser preview (`pnpm dev`), which opens a small sample course called Web Development. The desktop app looks the same. Saving, publishing and choosing folders only work in the desktop app.
