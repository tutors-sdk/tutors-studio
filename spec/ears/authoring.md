# Authoring

| Id       | Pattern    | Requirement                                                                                                                                                                    |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0001 | ubiquitous | The Studio shall change a course only by applying a plan the lecturer has accepted.                                                                                            |
| STU-0002 | event      | When a lecturer opens a course folder, the Studio shall show every folder with the kind Tutors reads it as, and mark each folder Tutors would leave out as won't be published. |
| STU-0003 | event      | When a lecturer accepts the rename a finding suggests, the Studio shall move the folder with everything in it and show the course checked again without that finding.          |
| STU-0004 | unwanted   | If applying a plan fails part-way, then the Studio shall undo every change the plan made and name the file that blocked it.                                                    |
| STU-0005 | state      | While no assistant is chosen, the Studio shall explain a finding with the rule's own message.                                                                                  |
| STU-0006 | unwanted   | If a plan names a path outside the course folder, then the Studio shall refuse the whole plan before changing anything.                                                        |
| STU-0007 | ubiquitous | The Studio shall describe every finding in the words @tutors/course-rules gives it.                                                                                            |
