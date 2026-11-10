# Usage counts

Issue #53 (ADR 0037): the next-phase document's evidence enabler. Counts are opt-in, numbers only, and stay on the lecturer's computer.

| Id       | Pattern    | Requirement                                                                                                                                                                                   |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0140 | optional   | Where a lecturer has turned on usage counts, the Studio shall count each publish, save, accepted change, Git hand-off and assistant draft or suggestion as a number by name on this computer. |
| STU-0141 | ubiquitous | The Studio shall keep usage counts off until the lecturer turns them on, and count nothing while they are off.                                                                                |
| STU-0142 | event      | When a lecturer turns usage counts off, the Studio shall clear the counts it kept.                                                                                                            |
| STU-0143 | event      | When a lecturer copies the usage counts, the Studio shall give only Studio's version and the counts by name, with no file names, course names or course content.                              |
