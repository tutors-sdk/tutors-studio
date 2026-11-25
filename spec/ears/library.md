# The library

Folders on the lecturer's computer that Studio searches for Tutors courses, so a course can be put together from material they and their colleagues already have (ADR 0061). Studio only reads them. The design is the "Tutors Studio: a content registry" doc.

| Id       | Pattern    | Requirement                                                                                                                                               |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0261 | event      | When a lecturer adds a library folder, the Studio shall list every Tutors course in it and in the folders below it, and check each with the course rules. |
| STU-0262 | ubiquitous | The Studio shall treat a folder holding a course.md as one course, and never as a folder of more courses.                                                 |
| STU-0263 | state      | While a course in a library folder has an error finding, the Studio shall show it as needing fixes and lend none of its items to another course.          |
| STU-0264 | ubiquitous | The Studio shall change nothing in a library folder.                                                                                                      |
| STU-0265 | unwanted   | If a library folder can't be read, then the Studio shall name it, say why, and still list the courses in the other folders.                               |
