# 0021. Step 9: fix all safe, and hand off through the computer's git

**Status:** Accepted
**Date:** 2026-11-08

## Context

Step 9 of the spec ("Check and publish") is the full findings list, a "Fix all safe" button, and a hand-off: "Commit and push" when the course folder is a git repository, next steps when it isn't. Most Tutors courses live in a GitHub repository that Netlify builds, so the push is the publish. Studio's `PublishPort` was a placeholder with no adapter, and `run_tool` could not run git.

## Decision

- **"Fix all safe" applies the rules' own safe fixes, as one plan.** `@tutors/course-rules` marks a finding's fix as safe (`finding.fix`) only when it changes nothing else: a rename that keeps the folder's kind, a file nothing links to, the standard `netlify.toml`. `AuthoringPort.planFixAll()` gathers those into one plan, renaming the deepest paths first so no rename moves a path a later one names. A suggested name without a safe fix stays a per-finding choice on the course map. The headless `fix` now applies the same plan.
- **`PublishPort` becomes the git hand-off.** `status()` reads the branch, the changed files and the remote; `commitAndPush(message)` runs `git add -A`, `git commit -m`, and `git push -u <remote> HEAD`. The adapter `publish/git` uses the computer's own git through `ProcessPort`, with whatever sign-in git already has (a credential helper, SSH keys). Studio never sees a password.
- **A new driving port, `HandOffPort`, guards the push.** It refuses a course with errors (STU-0039), and a course whose `.gitignore` doesn't leave out the generated `json/` folder, offering the plan that adds it (STU-0038). Outside a repository it commits nothing and points to Netlify (STU-0040).
- **`run_tool` runs only the hand-off's git calls.** `git --version`, the two `rev-parse` calls, `status --porcelain`, `remote`, `add -A`, `commit -m <message>` with nothing after the message, and `push -u <remote> HEAD` where the remote is a plain name. No `-c`, no `clone`, no `--amend`, no `--receive-pack`.
- **The check screen** lists every finding, errors first, each opening its folder; then "Fix all safe (N)", which shows the plan before anything changes; then the hand-off card. Teal goes to fixing while safe fixes remain, then to "Commit and push".

## Consequences

A push that needs a sign-in git hasn't stored fails with git's own last lines and a sentence saying to push once from a terminal or GitHub Desktop. Studio doesn't open a sign-in itself; that is the follow-up if lecturers hit it often. The browser preview has no git, so the hand-off card says it works in the desktop app.

## Specified by

STU-0036..STU-0040 (`spec/features/hand-off.feature`).
