Feature: Claude explains what is wrong with a course
  As a lecturer who finds the checker's sentences terse
  I want Claude to explain a problem in plain words, only for courses I allow it to read
  So that I understand what students would miss without sending my course anywhere I didn't choose

  Scenarios drive the authoring use cases with the real Claude adapter over Claude's API in memory, which
  records every request, and the lecturer's choices in Settings over a settings store and a keychain held
  in memory (ADR 0006, ADR 0016, ADR 0022).

  @stu-0041 @ears-optional
  Rule: Where the lecturer has chosen Claude, the Studio shall explain a finding in Claude's words, sending Claude only that finding.

    Scenario: Claude explains why Week 3 is missing
      Given a course with a folder named "Week 3" that the lecturer allowed Claude to read
      And the lecturer has chosen Claude with a working API key
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be Claude's answer
      And Claude shall have been sent the rule's message for "Week 3"
      And Claude shall not have been sent anything from the course's pages

  @stu-0042 @ears-unwanted
  Rule: If the lecturer has not allowed Claude to read a course, then the Studio shall send Claude nothing from that course and explain with the rule's own message.

    Scenario: A course Claude may not read
      Given a course with a folder named "Week 3" that the lecturer has not allowed Claude to read
      And the lecturer has chosen Claude with a working API key
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be the rule's own message
      And the Studio shall say "Claude can't read this course yet, so nothing was sent. Allow it on the Check and publish screen."
      And Claude shall have been sent nothing

  @stu-0043 @ears-unwanted
  Rule: If Claude refuses the API key, then the Studio shall explain with the rule's own message and say how to make a new key.

    Scenario: A revoked key
      Given a course with a folder named "Week 3" that the lecturer allowed Claude to read
      And the lecturer has chosen Claude with an API key Claude refuses
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be the rule's own message
      And the Studio shall say "Claude refused the API key. Make a new one in the Claude Console under API keys and paste it in Settings."

  @stu-0044 @ears-ubiquitous
  Rule: The Studio shall keep the Claude API key in the computer's keychain and never in its settings.

    Scenario: Pasting a key in Settings
      Given a lecturer with no assistant chosen
      When the lecturer chooses Claude and pastes the key "sk-ant-good"
      Then the keychain shall hold the key
      And no setting shall hold the key
      And Settings shall say a key is set

  @stu-0081 @ears-optional
  Rule: Where the lecturer has chosen a model on this computer, the Studio shall explain a finding with that model through Ollama, without asking to read the course first.

    Scenario: A model on this computer explains why Week 3 is missing
      Given a course with a folder named "Week 3" that the lecturer has not allowed any remote assistant to read
      And Ollama on this computer has the models "llama3.2:3b, qwen3:8b"
      And the lecturer has chosen a model on this computer
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be the local model's answer
      And Ollama shall have been sent the rule's message for "Week 3" for the model "llama3.2:3b"
      And nothing shall have gone anywhere but Ollama on this computer

  @stu-0082 @ears-unwanted
  Rule: If Ollama is not running on this computer, then the Studio shall explain with the rule's own message and say how to start Ollama.

    Scenario: Ollama is closed
      Given a course with a folder named "Week 3" that the lecturer allowed Claude to read
      And the lecturer chose a model on this computer while Ollama was open
      And Ollama has since been closed
      When the lecturer asks for an explanation of "Week 3"
      Then the explanation shall be the rule's own message
      And the Studio shall say "Studio couldn't reach Ollama on this computer. Open the Ollama app (or run ollama serve), then try again."

  @stu-0079 @ears-event
  Rule: When the lecturer chooses a model on this computer, the Studio shall offer the models Ollama already has, smallest first, and use the smallest until the lecturer picks another.

    Scenario: Choosing a model on this computer in Settings
      Given a lecturer with no assistant chosen
      And Ollama on this computer has the models "qwen3:8b, llama3.2:3b, gemma3:1b"
      When the lecturer chooses a model on this computer in Settings
      Then Settings shall offer "gemma3:1b, llama3.2:3b, qwen3:8b"
      And Settings shall show the chosen model as "gemma3:1b"
      When the lecturer picks the model "qwen3:8b"
      Then Settings shall show the chosen model as "qwen3:8b" from then on

  @stu-0080 @ears-unwanted
  Rule: If Ollama has no models, then the Studio shall offer to download a small one and choose it once it is downloaded.

    Scenario: A fresh Ollama
      Given a lecturer with no assistant chosen
      And Ollama on this computer has no models
      When the lecturer downloads the suggested model in Settings
      Then Ollama shall have been asked to download "llama3.2:3b"
      And the lecturer's assistant shall be a model on this computer, "llama3.2:3b"
