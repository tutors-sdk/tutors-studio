# Publishing

| Id       | Pattern  | Requirement                                                                                                                                                                          |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0021 | event    | When a lecturer previews a course on this computer, the Studio shall build it with the Tutors generator and show it in a Tutors reader running in a container on this computer.      |
| STU-0022 | unwanted | If neither Docker nor Podman is on the computer, then the Studio shall start nothing and say what to install.                                                                        |
| STU-0023 | event    | When a lecturer publishes a course to Netlify, the Studio shall build it with the Tutors generator, send only the files Netlify does not already hold, and give the tutors.dev link. |
| STU-0024 | unwanted | If a course has errors, then the Studio shall refuse to publish it and say how many to fix.                                                                                          |
| STU-0025 | unwanted | If Netlify refuses the access token, then the Studio shall publish nothing and say how to make a new token.                                                                          |
| STU-0078 | event    | When a lecturer publishes a course that has no netlify.toml straight from Studio, the Studio shall publish it without adding that file.                                              |
