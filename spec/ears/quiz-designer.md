# Quiz designer

| Id       | Pattern  | Requirement                                                                                                                                                                  |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0016 | event    | When a lecturer saves a new quiz in a topic, the Studio shall add one new quiz folder to that topic whose page the reader shows with the questions and right answers chosen. |
| STU-0017 | unwanted | If a quiz in the designer can't be saved so the reader shows it as typed, then the Studio shall change nothing and give the course-rules sentence for the question at fault. |
| STU-0018 | event    | When a lecturer opens a quiz, the Studio shall show its title, time limit, questions, answers and right answers without any markdown.                                        |
| STU-0019 | event    | When a lecturer saves changes to a quiz they opened, the Studio shall rewrite only that quiz's page and keep its title and introduction.                                     |
| STU-0020 | unwanted | If a quiz page holds a question the reader leaves out, then the Studio shall name that question when the quiz opens, before saving removes it.                               |
