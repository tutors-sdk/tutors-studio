# Folder registries

Sharing a ready course, or one item, into a folder registry that colleagues can add to their library, and borrowing from it (ADR 0063). A licence is always chosen; Studio suggests none (Leigh, 2026-11-25).

| Id       | Pattern    | Requirement                                                                                                                                                                                                                   |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0271 | event      | When a lecturer shares a ready course, or one of its items, into a folder registry, the Studio shall show one plan that copies it into the registry as the next version of its entry, and write nothing until they accept it. |
| STU-0272 | unwanted   | If a lecturer shares without a licence, then the Studio shall share nothing and ask for one.                                                                                                                                  |
| STU-0273 | ubiquitous | The Studio shall store each shared folder in a registry once, under the SHA-256 digest of its files.                                                                                                                          |
| STU-0274 | ubiquitous | The Studio shall leave out of every share the files a course keeps to itself: hidden files, Tutors' build output, the term's dates, student lists and hosting settings.                                                       |
| STU-0275 | event      | When a library folder holds a folder registry, the Studio shall list each of its entries at its latest version, with its licence, ready to pick from.                                                                         |
| STU-0276 | unwanted   | If the files of something picked from a registry no longer match the digest they were shared under, then the Studio shall copy nothing and say it has changed since it was shared.                                            |
| STU-0277 | unwanted   | If a lecturer shares from a course that needs fixing, then the Studio shall share nothing and say the course needs fixing first.                                                                                              |
| STU-0278 | ubiquitous | The Studio shall name, on the Borrowed material page, the registry entry, version and licence of every item copied from a registry.                                                                                           |
