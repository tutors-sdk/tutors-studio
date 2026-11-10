# Arranging a course

| Id       | Pattern  | Requirement                                                                                                                                                                       |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0095 | event    | When a lecturer puts the items of one kind in a folder in a new order, the Studio shall show a plan that renumbers their folders in that order before anything moves.             |
| STU-0096 | event    | When a lecturer moves an item to another week, the Studio shall show a plan that moves it there with the next free number of its kind.                                            |
| STU-0097 | unwanted | If a lecturer moves an item where Tutors does not show that kind, then the Studio shall change nothing and give course-rules' sentence for where it can go.                       |
| STU-0098 | event    | When a lecturer gives an item a new title, the Studio shall show a plan that rewrites only the title line of the page its card takes its title from.                              |
| STU-0099 | event    | When a lecturer hides a week from students, the Studio shall show a plan that adds the week to the course's ignore list in properties.yaml.                                       |
| STU-0100 | unwanted | If a lecturer asks to hide an item inside a week, then the Studio shall change nothing and give course-rules' sentence for how to keep it from students.                          |
| STU-0101 | event    | When a lecturer removes an item, the Studio shall show a plan that moves it into the course's bin, which Tutors never publishes, and deletes nothing.                             |
| STU-0102 | event    | When a lecturer drops an item on another, the Studio shall plan putting it in that item's place where both are of one kind in one folder, and otherwise moving it into the other. |
| STU-0103 | event    | When a lecturer moves an item earlier or later from the keyboard, the Studio shall plan swapping it with its neighbour of the same kind.                                          |
