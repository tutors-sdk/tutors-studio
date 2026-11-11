# Starting from a template

Starter templates are whole courses modelled on the Tutors reference course (tutors-sdk/tutors-reference-course), beside the guided questions (ADR 0039).

| Id       | Pattern    | Requirement                                                                                                                                                                                            |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0148 | ubiquitous | The Studio shall offer a starter template for each kind of module, each modelled on a topic of the Tutors reference course and each in 2, 4, 6, 8, 10 and 12 week lengths.                             |
| STU-0149 | event      | When a lecturer names a course and picks a template and a length, the Studio shall create a course that checks with no errors, with one week per teaching week holding what the template's week holds. |
| STU-0150 | event      | When a lecturer picks a template of six weeks or more, the Studio shall group the weeks into sections and make the last week a review with a quiz.                                                     |
| STU-0151 | unwanted   | If the template or the length a lecturer asks for is not one Studio offers, then the Studio shall name each answer to change and create nothing.                                                       |
| STU-0152 | event      | When a lecturer opens a course made from a template, the Studio shall show every week as still to write.                                                                                               |
