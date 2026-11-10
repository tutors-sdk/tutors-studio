# Undo and history

| Id       | Pattern    | Requirement                                                                                                                                      |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0091 | event      | When a lecturer puts back a change Studio applied, the Studio shall show the plan that reverses it and apply that plan only once it is accepted. |
| STU-0092 | ubiquitous | The Studio shall list each change it applied to the open course since it was opened, newest first, with the time it was applied.                 |
| STU-0093 | unwanted   | If a file a change wrote has changed since, then the Studio shall keep that change in place and name the file.                                   |
| STU-0094 | event      | When a lecturer puts back a change that added files, the Studio shall move them to the course's bin and delete nothing.                          |
