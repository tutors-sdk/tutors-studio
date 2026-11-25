# Composing a course

A new course made from weeks and items in the lecturer's library (ADR 0062). Studio always copies what was picked, and says so; the copy and the original change separately (Leigh, 2026-11-25).

| Id       | Pattern    | Requirement                                                                                                                                                                                                                    |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0266 | event      | When a lecturer composes a course from their library, the Studio shall show one plan that copies each week and item they picked into the week they chose, numbered as Tutors reads it, and write nothing until they accept it. |
| STU-0267 | ubiquitous | The Studio shall say, in every plan that composes a course, that it copies what was picked and that the copy and the original change separately.                                                                               |
| STU-0268 | ubiquitous | The Studio shall record, for every item it copies from the library, the folder, course and path it came from and a digest of its files, in a file Tutors does not publish.                                                     |
| STU-0269 | event      | When a lecturer composes a course, the Studio shall add a page to the module's own unit that lists each copied item and the course it came from.                                                                               |
| STU-0270 | unwanted   | If a lecturer picks something from a course that needs fixing, then the Studio shall copy nothing and say the course needs fixing first.                                                                                       |
