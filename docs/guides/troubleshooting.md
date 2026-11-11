# Questions and problems

## Installing and opening

**My computer won't open Studio, or says it can't check it.** Studio's installers aren't signed yet, so your computer asks once. [Installing Tutors Studio](../install.md#if-your-computer-asks-whether-to-open-it) shows what to click on a Mac, on Windows and on Linux.

**Studio opened the start screen, not my course.** Its folder was moved, renamed or deleted, so Studio took it off **Your courses** and said so. Use **Load a course** and choose the folder where it is now.

## The course map

**A week or item says "Won't be published".** Its folder's name doesn't tell Tutors what it is. Open it and use **Let students see this** ([guide 2](02-course-map.md#fixing-wont-be-published)).

**I changed files in another app and Studio shows the change.** That's expected: Studio watches the course folder and reads it again whenever something changes.

**A week says "Still to write" but I've written it.** At least one page in the week still has the starter text Studio wrote. Open the week and look for **Not written yet** under its pages.

## Adding files

**Some dropped files went to "Left in the tray".** Nothing in their name says which week they're for, or the week they name doesn't exist yet. Use **Choose a week** beside each one, or add the week first.

**A file I dropped is flagged as something students won't see.** It's a kind Tutors doesn't publish (an Excel or Keynote file, say). Studio kept it in the week's working files. Export it to PDF, or zip it, and drop that. See [Where your files go](04-where-files-go.md).

**A Word file's download link doesn't work on the published course.** Tutors never publishes Word files. Studio now zips them when it places them. A reading made by an older Studio may still link the `.docx`: drop the Word file on the week again, or attach it to the reading with **Attach a file**, and remove the old link.

**My lab shows a PDF instead of its steps.** A PDF sits at the top level of the lab and the lab has no `img/main` picture, so Tutors shows the PDF. Studio no longer puts files there, but a lab made elsewhere can have one. With Advanced mode on, move the PDF into the lab's `archives/` folder and link it from a step as `archives/name.pdf`, or attach it to a step with **Attach a file**.

## Saving and publishing

**Publish says to sort out problems first.** The course has errors. Open **Check and publish**, try **Fix all safe**, then deal with what's left. Each item links to where the problem is.

**I can't find the Publish screen.** It opens from the helper's **Publish** button once the course checks out. If you've hidden the helper, bring it back under **Settings → Helper**.

**Publishing says Deno, Docker or Podman is missing.** Building the course for Netlify, or as a website, needs [Deno](https://deno.com) (free). If you'd rather not install it, Docker Desktop or Podman also works. **Save the course** needs none of them.

**Netlify refused the sign-in.** Studio published nothing. Under **Settings → Accounts**, press **Sign out of Netlify**, then sign in again.

**Commit and push says the folder isn't a Git repository.** Studio only hands off a course that's already in Git. Open the folder in GitHub Desktop and choose to make it a repository, or publish from Studio instead.

## The assistant

**Claude says it can't read this course.** You decide that course by course: tick **Let Claude read this course's problems…** on **Check and publish**.

**"A model on this computer" can't find Ollama.** Install it free from [ollama.com/download](https://ollama.com/download), open it, then press **Check again** in Settings.

## Undo

**Put back says a file has changed since.** You (or another app) changed a file that change wrote, so Studio left it in place rather than lose your later work. It names the file. Change it back yourself if you need to.

**Where did a removed item go?** Into the course's bin, the `.tutors-bin` folder inside the course folder. Use **Put back** under **Changes**, or move it out yourself.

## Still stuck?

[Open an issue](https://github.com/tutors-sdk/tutors-studio/issues/new) saying which computer you have, what you pressed and what you saw. A screenshot helps most. Ask the helper first: it knows Studio's own guide.
