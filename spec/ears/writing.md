# Writing in plain language

| Id       | Pattern  | Requirement                                                                                                                                                           |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0072 | event    | When a lecturer writes a page in plain language, the Studio shall keep it as markdown that reads back the same, and save it only through a plan the lecturer accepts. |
| STU-0073 | unwanted | If a page holds something plain writing can't keep, then the Studio shall say what it is and leave the page to the markdown editor.                                   |
| STU-0085 | optional | Where a page starts with settings between --- lines, the Studio shall let the lecturer write the rest plainly and keep the settings as they were.                     |
| STU-0086 | state    | While a page still holds the starter text it was made with, the Studio shall mark it as not written yet, and once the lecturer's writing is saved, as written.        |
| STU-0134 | event | When a lecturer inserts a table, maths, a diagram or a code block while writing a page, the Studio shall add it as the markdown Tutors reads, kept as text and never drawn, that reads back the same. |
