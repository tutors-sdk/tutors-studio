# 14. Your library

Your library is the folders on your computer where you keep Tutors courses: your Documents, a shared drive, a folder of a colleague's modules. Studio finds every course in them, checks each one, and tells you which are ready to use. It never changes a course there; the only thing it writes is what you share into a registry.

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

## Share with colleagues

A **registry** is a folder of shared courses and items that anyone can add to their library: a folder on a shared drive, say, or a USB stick.

1. Press **Share** on a course that is ready to use.
2. Under **What to share**, keep **The whole course**, or choose one week, lecture or lab.
3. Press **Choose a folder** and pick the registry folder. An empty folder becomes a new registry.
4. Give a **Publisher** name (yours, or your department's) and a **Licence**. Studio shares nothing without a licence, so colleagues know how they may use it. CC-BY-4.0 lets anyone reuse it if they credit you; any SPDX licence identifier works.
5. Press **See the plan**, then **Share**. The registry joins your library, so you see what you shared under **Ready to use**.

Studio copies the files into the registry, and your course stays as it is. Share again after changing the course and you get the next version; anything unchanged is stored once. Studio never shares the term's dates (`calendar.yaml`), the student list (`enrollment.yaml`), hosting settings (`netlify.toml`), hidden files or Tutors' build output.

**Borrowing from a registry** works like borrowing from a course: press **Pick from it** on an entry. The Borrowed material page names the entry, its version and its licence. If someone changed the registry's files by hand after they were shared, Studio won't copy them and says so.

## Google Drive

A library folder or a registry can be a folder in Google Drive, so colleagues anywhere can share one registry.

1. Press **Add a Google Drive folder**. The first time, press **Sign in to Google** and allow Studio in your browser. (A copy of Studio built without a Google sign-in asks for an access token instead.)
2. In Drive, open the folder's **Share** menu, choose **Copy link**, and paste the link into **Folder link**. Press **Add**.

Studio searches the Drive folder like any other. To share into a registry on Drive, press **Use a Google Drive folder** in the share panel and paste the registry folder's link; an empty Drive folder becomes a new registry. Colleagues need the folder shared with their Google account to borrow from it, and edit access to share into it.

## From a terminal

`pnpm headless library <folder> [<folder> ...]` prints the same list, ready courses first. Add `--items` to list every week and item each ready course has, with its path.

`pnpm headless compose <parent> --name "<course>" --from <library folder> --pick "<course>:<item>@<week>" ...` makes a new course from picks. `<course>` is the course's folder in the library, `<item>` the path `--items` prints, and `<week>` the week it goes in (0 for the module's own unit). See [Studio from a terminal](11-command-line.md).

`pnpm headless share <library folder> --course <course> [--item <item>] --to <registry folder> --publisher "<name>" --licence CC-BY-4.0` shares a ready course, or one item, into a registry.

A Google Drive folder is `gdrive:<folder id>` on the command line, with an access token in `GOOGLE_DRIVE_TOKEN`: `GOOGLE_DRIVE_TOKEN=... pnpm headless library gdrive:1AbC...`.
