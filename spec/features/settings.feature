Feature: Settings for how Studio looks and the Tutors .env
  As a lecturer who may have dyslexia or low vision, and who sometimes runs Tutors with real sign-in
  I want to choose how Studio looks and to set Tutors' environment in one place
  So that Studio is comfortable to read and the reader on my computer runs the way I need

  Scenarios drive the Settings use case over settings and a keychain in memory, and the attributes the
  window's root carries, which paper-tokens.css alone turns into colours, fonts and sizes (ADR 0020).

  @stu-0030 @ears-event
  Rule: When a lecturer chooses light or dark in Settings, the Studio shall show every screen in that appearance and keep it the next time it opens.

    Scenario: Dark, and still dark after a restart
      Given a lecturer whose Studio follows the computer's appearance
      When the lecturer chooses dark in Settings
      Then the window shall be marked theme "dark"
      And Studio opened again shall still be marked theme "dark"

  @stu-0031 @ears-state
  Rule: While dyslexia mode is on, the Studio shall show text in a dyslexia-friendly font on a cream background with wider letter, word and line spacing and no italics.

    @active
    Scenario: Dyslexia mode with OpenDyslexic
      Given a lecturer whose Studio follows the computer's appearance
      When the lecturer turns on dyslexia mode
      Then the window shall be marked dyslexia "opendyslexic"
      And the stylesheet shall give that mode OpenDyslexic, a cream background, wider letter spacing, word spacing 0.16em and no italics

    @inactive
    Scenario: Dyslexia mode off
      Given a lecturer whose Studio follows the computer's appearance
      Then the window shall be marked dyslexia "off"

  @stu-0032 @ears-event
  Rule: When a lecturer chooses a larger text size, the Studio shall enlarge text and controls together, up to twice their size.

    Scenario: Ctrl and plus, again and again
      Given a lecturer whose Studio follows the computer's appearance
      When the lecturer makes the text bigger 6 times
      Then the window shall be marked text size "200"
      And the stylesheet shall scale text and the sidebar by 2 at that size

  @stu-0033 @ears-state
  Rule: While high contrast is on, the Studio shall show black on white or white on black with solid borders and a thicker focus ring.

    @active
    Scenario: High contrast chosen
      Given a lecturer whose Studio follows the computer's appearance
      When the lecturer chooses high contrast
      Then the window shall be marked contrast "high"
      And the stylesheet shall give that mode black and white ink and a 4px focus ring

    @inactive
    Scenario: Standard contrast
      Given a lecturer whose Studio follows the computer's appearance
      Then the window shall be marked contrast "system"

  @stu-0034 @ears-event
  Rule: When a lecturer sets a Tutors environment variable in Settings, the Studio shall give it to the Tutors reader on this computer and keep a secret one only in the keychain.

    Scenario: Real sign-in for the local reader
      Given a lecturer whose Studio follows the computer's appearance
      When the lecturer sets PUBLIC_ANON_MODE to "FALSE" and PRIVATE_AUTH_SECRET to "a-very-long-secret-of-thirty-two-chars"
      And the lecturer previews the course on this computer
      Then the reader container shall get "PUBLIC_ANON_MODE=FALSE" and "PRIVATE_AUTH_SECRET=a-very-long-secret-of-thirty-two-chars"
      And the settings store shall not hold "a-very-long-secret-of-thirty-two-chars"
      And Settings shall show PRIVATE_AUTH_SECRET as set without its value

  @stu-0035 @ears-unwanted
  Rule: If a setting holds only the placeholder from the Tutors .env.example, then the Studio shall not pass it to the reader.

    Scenario: Nothing set
      Given a lecturer whose Studio follows the computer's appearance
      When the lecturer previews the course on this computer
      Then the reader container shall get "PUBLIC_ANON_MODE=TRUE"
      And the reader container shall get no PUBLIC_SUPABASE_URL or PUBLIC_PDF_KEY
