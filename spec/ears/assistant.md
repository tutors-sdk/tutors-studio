# Assistant: Claude, and a model on this computer

| Id       | Pattern    | Requirement                                                                                                                                                  |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| STU-0041 | optional   | Where the lecturer has chosen Claude, the Studio shall explain a finding in Claude's words, sending Claude only that finding.                                |
| STU-0042 | unwanted   | If the lecturer has not allowed Claude to read a course, then the Studio shall send Claude nothing from that course and explain with the rule's own message. |
| STU-0043 | unwanted   | If Claude refuses the API key, then the Studio shall explain with the rule's own message and say how to make a new key.                                      |
| STU-0044 | ubiquitous | The Studio shall keep the Claude API key in the computer's keychain and never in its settings.                                                               |

## A model on this computer (Ollama, ADR 0027)

| Id       | Pattern  | Requirement                                                                                                                                                                      |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STU-0079 | event    | When the lecturer chooses a model on this computer, the Studio shall offer the models Ollama already has, smallest first, and use the smallest until the lecturer picks another. |
| STU-0080 | unwanted | If Ollama has no models, then the Studio shall offer to download a small one and choose it once it is downloaded.                                                                |
| STU-0081 | optional | Where the lecturer has chosen a model on this computer, the Studio shall explain a finding with that model through Ollama, without asking to read the course first.              |
| STU-0082 | unwanted | If Ollama is not running on this computer, then the Studio shall explain with the rule's own message and say how to start Ollama.                                                |
