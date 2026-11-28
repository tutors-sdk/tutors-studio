# The Tutors inside Studio

| Id       | Pattern    | Requirement                                                                                                                                                                                    |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0171 | ubiquitous | The Studio shall build and check courses with the Tutors generator, tutors-lite and Deno that tutors-bundle.json names, and no other.                                                          |
| STU-0172 | unwanted   | If a part of the bundle downloaded for a Studio build does not have the SHA-256 that tutors-bundle.json gives for it, then the Studio shall fail the build and name the part.                  |
| STU-0173 | ubiquitous | The Studio shall say in Settings which Tutors release is inside it.                                                                                                                            |
| STU-0209 | ubiquitous | The Studio's Tutors tools shall be compiled from a tutors-mono-repo checkout at the commit that tutors-bundle.json names, and from no other.                                                   |
| STU-0220 | event      | When tutors-mono-repo publishes a release newer than the one tutors-bundle.json names, the manifest bot shall open a pull request that moves the manifest and its pins to that release.        |
| STU-0221 | state      | While tutors.dev runs a newer Tutors release than the one inside Studio, the Studio shall say so beside the preview.                                                                           |
| STU-0313 | event      | When a developer runs `pnpm tauri dev` and the Tutors reader inside Studio is missing or built from another commit than tutors-bundle.json pins, the build shall say so and offer to build it. |
