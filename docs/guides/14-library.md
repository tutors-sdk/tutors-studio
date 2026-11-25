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

## Make a new course from your library

You can put together a new course from weeks, lectures, labs and other items in the courses that are ready to use.

1. Press **Pick from it** on a course. Studio lists its weeks and, under each, its items.
2. Press **Pick** on anything you want. A whole week goes in the next week of your new course; an item goes in week 1 until you change it.
3. Under **Your new course**, give the course a name, and choose where each pick goes: a week, or **The module's own unit** for things that belong to the whole module. **Take out** drops a pick.
4. Press **See the plan**. Studio says what it will make, and **Create course** makes it in a folder you choose, then opens it.

**Everything is a copy.** Your new course gets its own copy of each pick. Changing it doesn't change the original, and later changes to the original don't reach your course. A page called **Borrowed material** in the module's own unit lists what came from where, and Studio keeps a note of each copy's source in the course (in a hidden `.tutors` folder that students never see).

## From a terminal

`pnpm headless library <folder> [<folder> ...]` prints the same list, ready courses first. Add `--items` to list every week and item each ready course has, with its path.

`pnpm headless compose <parent> --name "<course>" --from <library folder> --pick "<course>:<item>@<week>" ...` makes a new course from picks. `<course>` is the course's folder in the library, `<item>` the path `--items` prints, and `<week>` the week it goes in (0 for the module's own unit). See [Studio from a terminal](11-command-line.md).
