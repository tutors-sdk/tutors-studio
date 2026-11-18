# The Tutors inside Studio

| Id       | Pattern    | Requirement                                                                                                                                                                   |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0171 | ubiquitous | The Studio shall build and check courses with the Tutors generator, tutors-lite and Deno that tutors-bundle.json names, and no other.                                         |
| STU-0172 | unwanted   | If a part of the bundle downloaded for a Studio build does not have the SHA-256 that tutors-bundle.json gives for it, then the Studio shall fail the build and name the part. |
| STU-0173 | ubiquitous | The Studio shall say in Settings which Tutors release is inside it.                                                                                                           |
