# Assistant: Claude

| Id       | Pattern    | Requirement                                                                                                                                                  |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0041 | optional   | Where the lecturer has chosen Claude, the Studio shall explain a finding in Claude's words, sending Claude only that finding.                                |
| STU-0042 | unwanted   | If the lecturer has not allowed Claude to read a course, then the Studio shall send Claude nothing from that course and explain with the rule's own message. |
| STU-0043 | unwanted   | If Claude refuses the API key, then the Studio shall explain with the rule's own message and say how to make a new key.                                      |
| STU-0044 | ubiquitous | The Studio shall keep the Claude API key in the computer's keychain and never in its settings.                                                               |
