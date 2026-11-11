# 6. Arranging a course

Every change here shows **Before anything changes** first. Nothing moves until you accept.

## Put things in order

- **Drag** a week or an item just above or just below another of its kind, and Studio plans putting it there, in that order. Studio renumbers the folders so Tutors shows them in the same order.
- **Drag an item onto a week in the contents** to move it into that week. Studio only moves something inside a folder where Tutors shows that kind. Otherwise it places the item beside the folder.
- **From the keyboard**, **Earlier** and **Later** swap an item with its neighbour of the same kind.

## Change this week, or this item

Each week and item has **Change this week** (or **Change this item**):

| Action                 | What happens                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Rename**             | Type a **New title**. Studio rewrites only the title line of the page the card takes its title from. The folder keeps its name. |
| **Move**               | **Choose where** (another week, or the top of the course). It goes there with the next free number of its kind.                 |
| **Hide from students** | Weeks only. Studio adds the week to the course's ignore list, so Tutors leaves it out. **Show to students again** reverses it.  |
| **Remove to the bin**  | Studio moves the item into the course's bin. Tutors never publishes it and nothing is deleted. Put it back from **Changes**.    |

If you move something where Tutors doesn't show that kind, or try to hide an item inside a week (Tutors can only hide whole weeks), Studio changes nothing and gives the rules' sentence for what you can do instead.

### The bin

The bin is a folder inside the course called `.tutors-bin`. Tutors skips it, so students never see what's in it. Studio never deletes your files: removing, replacing a card picture and undoing an added file all move files to the bin. You can empty it yourself in your file manager whenever you like.

## Course details

On the course home, **Course details** has:

- **Title**: the course's name, as students see it.
- **Who it's by**: the credits line shown under the title.
- **Teaching starts**: a start date. Studio writes a calendar dating each week of the course from that day.

**Save details** shows the plan. Studio rewrites only the course page's title line and the credits line in `properties.yaml`.

## Card pictures

Every card (the course, a week, an item) shows a picture. Without one, Tutors shows the usual icon for its kind. Under **Card picture**, **Choose a picture** shows the plan: Studio copies the picture into the item, moves any earlier picture to the bin, and takes out an icon setting that would otherwise show instead. Studio names the picture by its file name and doesn't draw it. If the file isn't a picture, Studio changes nothing and names the kinds of file a card can show.

## Next

[Undo and Changes](07-undo-and-changes.md)
