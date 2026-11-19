# An agent working on a course

| Id       | Pattern    | Requirement                                                                                                                                           |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0202 | ubiquitous | The Studio shall expose no tool that writes a file other than plan_apply.                                                                             |
| STU-0203 | unwanted   | If an agent applies a plan that no propose tool made in the same session, or one already applied, then the Studio shall refuse it and change nothing. |
| STU-0204 | state      | While "Let an assistant on this computer work on this course" is off, the Studio shall refuse every tool call for that course.                        |
