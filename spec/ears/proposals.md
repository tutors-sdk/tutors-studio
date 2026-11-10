# The assistant that proposes

Feature 13 (ADR 0036): the chosen assistant drafts and suggests in text; Studio turns its answer into a plan the lecturer accepts.

| Id       | Pattern  | Requirement                                                                                                                                                                                                                             |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0136 | event    | When a lecturer asks the chosen assistant to draft a lab from their notes, the Studio shall send it only those notes and propose a plan that adds the steps it drafts after the lab's own, writing nothing until the plan is accepted.  |
| STU-0137 | event    | When a lecturer asks the chosen assistant to suggest titles and an order for a week, the Studio shall send it only the week's titles and the start of each page, and propose one plan that retitles and reorders the week as suggested. |
| STU-0138 | unwanted | If no assistant is chosen, or its answer can't be read as steps or a list, then the Studio shall say so and propose no plan.                                                                                                            |
