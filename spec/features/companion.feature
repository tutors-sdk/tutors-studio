Feature: A companion that waits its turn, and depth that is opt-in
  As a lecturer who is not a developer
  I want help that speaks at the right moments and answers when I ask
  So that I can publish a course without learning how Tutors works, and reach the files only if I choose

  @stu-0045 @ears-event
  Rule: When a course with errors opens, the companion shall say how many things need sorting out and offer to show them.

    Scenario: Two things to fix
      Given a course with 2 errors
      When the course opens
      Then the companion shall say "2 things need sorting out before students can see everything."
      And the companion shall offer to go to "problem"

  @stu-0046 @ears-state
  Rule: While the lecturer is typing or dragging, the companion shall stay silent.

    Scenario: Typing when a course opens
      Given a course with 2 errors
      And the lecturer is typing
      When the course opens
      Then the companion shall say nothing

    Scenario: Every trigger against every state
      Then no trigger shall speak while busy or hidden, and each shall say at most one sentence with at most one place to go

  @stu-0047 @ears-unwanted
  Rule: If the companion has said a moment in the last ten minutes, then the companion shall not say it again.

    Scenario: Opened again straight away
      Given a course with 2 errors
      And the companion said that moment 5 minutes ago
      When the course opens
      Then the companion shall say nothing

    Scenario: Opened again later
      Given a course with 2 errors
      And the companion said that moment 11 minutes ago
      When the course opens
      Then the companion shall say "2 things need sorting out before students can see everything."

  @stu-0048 @ears-event
  Rule: When the lecturer hides the companion, the Studio shall say no moments until the lecturer brings it back, and remember that the next time it opens.

    Scenario: Hidden, and still hidden after a restart
      Given a lecturer with a fresh Studio
      When the lecturer hides the companion
      Then Studio opened again shall have the companion hidden

  @stu-0049 @ears-state
  Rule: While no assistant is chosen, the companion shall answer a question from Studio's own guide.

    Scenario: How to publish
      Given no assistant is chosen
      When the lecturer asks "How do I publish this?"
      Then the answer shall come from the guide
      And the answer shall mention "Check and publish"

  @stu-0050 @ears-optional
  Rule: Where the lecturer has chosen an assistant and allowed it to read the course, the companion shall answer in the assistant's words, sending only the question, the screen and the checker's sentences.

    Scenario: Claude answers
      Given Claude is chosen and allowed to read the course
      When the lecturer asks "Why is week 3 missing?"
      Then the answer shall be Claude's
      And Claude shall have been sent the question, the screen and the checker's sentence
      And Claude shall not have been sent anything from the course's pages

  @stu-0051 @ears-unwanted
  Rule: If the assistant cannot answer, then the companion shall answer from Studio's own guide and say why.

    Scenario: Not allowed to read this course
      Given Claude is chosen but not allowed to read the course
      When the lecturer asks "How do I publish this?"
      Then the answer shall come from the guide
      And the companion shall say "Claude can't read this course yet, so nothing was sent. Allow it on the Check and publish screen."
      And Claude shall have been sent nothing

  @stu-0052 @ears-ubiquitous
  Rule: The companion shall never write to a course.

    Scenario: Asking changes nothing
      Given Claude is chosen and allowed to read the course
      When the lecturer asks "Fix everything for me"
      Then the course shall be unchanged

  @stu-0053 @ears-state
  Rule: While Advanced mode is off, the Studio shall show no file names, Tutors environment settings, rules version or markdown editor.

    Scenario: A fresh Studio
      Given a lecturer with a fresh Studio
      Then the advanced tools shall be off

  @stu-0054 @ears-event
  Rule: When the lecturer turns on Advanced mode, the Studio shall show those tools and keep them on the next time it opens.

    Scenario: Turned on, and still on after a restart
      Given a lecturer with a fresh Studio
      When the lecturer turns on Advanced mode
      Then Studio opened again shall have the advanced tools on

  @stu-0055 @ears-event
  Rule: When a lecturer in Advanced mode opens a page, the Studio shall show its markdown and a preview that leaves out raw HTML.

    Scenario: A page with a script in it
      Given a course with a page
      When the lecturer opens the page in the editor
      Then the editor shall hold the page's markdown
      And the preview shall draw the heading and show the script as text

  @stu-0056 @ears-event
  Rule: When a lecturer saves an edited page, the Studio shall offer a plan that writes only that page and write nothing until it is accepted.

    Scenario: Save, then accept
      Given a course with a page
      When the lecturer opens the page in the editor
      And the lecturer saves it with new words
      Then the plan shall write only that page
      And the page on disk shall be unchanged
      When the lecturer accepts the plan
      Then the page on disk shall have the new words

    Scenario: Nothing changed
      Given a course with a page
      When the lecturer opens the page in the editor
      And the lecturer saves it unchanged
      Then the Studio shall offer no plan and say "There are no changes to save."

  @stu-0058 @ears-event
  Rule: When a lecturer fixes a problem the rules mark safe, the Studio shall offer a plan holding that fix and write nothing until it is accepted.

    Scenario: The standard publishing file
      Given a course with no publishing file
      When the lecturer fixes that problem
      Then the plan shall add that file
      And the course shall not have that file yet

  @stu-0057 @ears-unwanted
  Rule: If a page changed after it was opened in the editor, then the Studio shall offer no plan and say so.

    Scenario: Changed underneath
      Given a course with a page
      When the lecturer opens the page in the editor
      And the page changes on the computer
      And the lecturer saves it with new words
      Then the Studio shall offer no plan and say "This page changed on your computer after you opened it. Close it and open it again so nothing is lost."

  @stu-0074 @ears-state
  Rule: While Advanced mode is off, the check and publish screens shall name no developer tool, except a service or tool the lecturer must sign in to or install.

    Scenario: Every plain sentence
      Given Advanced mode is off
      Then no sentence on the check and publish screens shall use a developer's word

  @stu-0075 @ears-optional
  Rule: Where Advanced mode is on, the check and publish screens shall name the hand-off to GitHub and the hosting service.

    Scenario: The technical words
      Given Advanced mode is on
      Then the screens shall say "Hand off to GitHub" and "Publish to Netlify"
