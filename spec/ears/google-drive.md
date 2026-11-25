# Registries on Google Drive

Library folders and registries kept in Google Drive and reached through the Drive API, the first hosted registry (ADR 0064, Leigh 2026-11-25: "use google drive as a starting point").

| Id       | Pattern    | Requirement                                                                                                                                                              |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0279 | event      | When a lecturer adds a Google Drive folder to their library by its link, the Studio shall search it for courses and registries as it searches a folder on this computer. |
| STU-0280 | ubiquitous | The Studio shall share into, and borrow from, a registry in a Google Drive folder as it does a registry folder on this computer.                                         |
| STU-0281 | unwanted   | If the Studio is not signed in to Google Drive, or Google refuses its sign-in, then the Studio shall read nothing from Drive and say to sign in.                         |
| STU-0282 | unwanted   | If what a lecturer pastes is not the link of a Google Drive folder, then the Studio shall add nothing and say how to copy one.                                           |
| STU-0283 | ubiquitous | The Studio shall write in Google Drive only into a folder that is a registry, or the registry.json that starts one.                                                      |
