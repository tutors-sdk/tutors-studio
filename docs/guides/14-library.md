# 14. Your library

Your library is the folders on your computer where you keep Tutors courses: your Documents, a shared drive, a folder of a colleague's modules. Studio finds every course in them, checks each one, and tells you which are ready to use. It never changes a file there.

## Add a folder

1. On the start screen, press **Your library**.
2. Press **Add a folder** and choose a folder. Studio looks in it and in the folders inside it, up to six levels down.
3. Add as many folders as you like. **Take out** removes a folder from your library; its files stay where they are.

Studio counts a folder as a course when it holds a `course.md`, the page every Tutors course starts from. It doesn't look inside a course for more courses.

## Ready to use, or needs fixing

Studio checks every course with the same rules as Tutors itself:

- **Ready to use**: Tutors would publish it as it is. Studio shows how many weeks, lectures, labs and other items it has, and any warnings.
- **Needs fixing**: something in it would stop Tutors publishing it correctly. Studio lends nothing from these courses until they check out. Press **Open**, and **Check** lists each problem with its fix.

If Studio can't read a folder (a drive that isn't connected, say), it says which folder and why, and still lists the courses in the others.

## From a terminal

`pnpm headless library <folder> [<folder> ...]` prints the same list, ready courses first. Add `--items` to list every week and item each ready course has. See [Studio from a terminal](11-command-line.md).
