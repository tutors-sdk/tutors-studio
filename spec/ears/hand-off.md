# Check and publish (step 9)

| Id       | Pattern  | Requirement                                                                                                                                                                        |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0036 | event    | When a lecturer asks to fix everything safe, the Studio shall offer one plan holding every fix the rules mark safe, with the deepest files and folders renamed first.              |
| STU-0037 | event    | When a lecturer commits and pushes a course with no errors, the Studio shall add every change, commit it with the lecturer's message, and push the branch with the computer's git. |
| STU-0038 | unwanted | If the course's .gitignore does not leave out the generated json folder, then the Studio shall commit nothing and offer the plan that adds it.                                     |
| STU-0039 | unwanted | If a course has errors, then the Studio shall commit nothing and say how many to fix.                                                                                              |
| STU-0040 | state    | While the course folder is not a git repository, the Studio shall commit nothing and say how to publish instead.                                                                   |
