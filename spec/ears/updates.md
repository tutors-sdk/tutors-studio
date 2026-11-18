# Updating Studio

| Id       | Pattern  | Requirement                                                                                                                                                                  |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0109 | event    | When a lecturer checks for a newer Studio and one is released, the Studio shall name its version and install nothing until the lecturer accepts.                             |
| STU-0110 | unwanted | If this copy of Studio carries no update key, then the Studio shall point the lecturer to the download page instead of offering an update.                                   |
| STU-0111 | event    | When a lecturer accepts a newer Studio, the Studio shall download and install it, then restart.                                                                              |
| STU-0179 | event    | When Studio opens and a day has passed since it last asked for a newer version, the Studio shall ask for the latest version on the lecturer's channel and download nothing.  |
| STU-0180 | event    | When Studio opens and finds a newer version, the Studio shall say on the start screen and the course home which Studio and which Tutors it holds, with Update now and Later. |
| STU-0181 | state    | While a plan is being applied or a course is being saved or published, the Studio shall not install an update.                                                               |
| STU-0182 | unwanted | If an update's signature does not match the key in the app, then the Studio shall discard it, install nothing and say the update could not be checked.                       |
| STU-0183 | optional | Where the lecturer has turned on Keep Studio up to date, the Studio shall download a newer version in the background when it opens and install it when Studio closes.        |
