# What the design review changed

The first design review of every screen (docs/design-review/README.md, 2026-11-19) found these; each is a behaviour a lecturer can see.

| Id       | Pattern | Requirement                                                                                                                                                                                                     |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0215 | state   | While a course has no errors, the Studio shall say under its title how many weeks are still to write, and lead with Check and publish only once a week is written and no other screen's next action is showing. |
| STU-0216 | event   | When the lecturer closes an editor with words not yet saved, the Studio shall ask whether to save them first, close without saving, or keep writing.                                                            |
| STU-0217 | event   | When the lecturer adds a quiz to a week, the quiz designer shall name the week by the title students see, never by its folder.                                                                                  |
| STU-0218 | state   | While a week is hidden from students, its page shall say so and offer only to show it again.                                                                                                                    |
| STU-0219 | event   | When the lecturer opens Settings, an editor, the quiz designer, Check and publish or Changes, the companion shall put away what it was saying.                                                                  |
