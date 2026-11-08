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
