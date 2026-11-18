# 11. Studio from a terminal

`pnpm headless` is Studio without a window. It runs the same use cases as the app, over the files on disk, so any journey can be replayed from a terminal, a script or CI. It's how the EARS scenarios in `spec/` are driven. You need a clone of this repository, Node and pnpm ([Develop](../../README.md#develop)).

Each command that changes a course applies its plan straight away, as if you'd accepted it, and prints `Done: …` with the plan's summary. When there's nothing to change, it says so.

## Making a course

```sh
# A new course from a reference course, the Lecture and lab template, or your own week
pnpm headless templates                                            # the template and every reference course, with their ids
pnpm headless new ~/courses --name "Web Development II" --example web-dev-2 [--lecturer "A. Lecturer"]
pnpm headless new ~/courses --name "Web Development" --template lecture-lab --weeks 12
pnpm headless new ~/courses --name "Web Development" --weeks 12 --lectures 1 --labs 1 [--readings 0] [--project] [--lecturer "A. Lecturer"]

# A folder of your own material made into a new course (the folder is never changed)
pnpm headless load ~/Desktop/web-dev-material ~/courses --name "Web Development" [--lecturer "A. Lecturer"] [--start 2026-09-14]
```

`load` on a folder that's already a Tutors course says so and writes nothing.

## The course live in Tutors on this computer

```sh
TUTORS_READER=src-tauri/resources/reader pnpm headless ~/courses/web-development live
pnpm headless ~/courses/web-development live ~/code/tutors-mono-repo
```

With no folder, the course shows in the Tutors reader inside Studio: the static files `TUTORS_READER` names, which `pnpm bundle reader <your copy of tutors-mono-repo>` builds. They are served on 127.0.0.1 from port 8200 with their own page for any path and a content security policy ([ADR 0045](../adr/0045-the-tutors-reader-inside-studio.md)). With a folder, Studio builds the course, serves it on 127.0.0.1 (port 8190, or the next free one), runs `pnpm dev` in your copy of Tutors with `PUBLIC_ANON_MODE=TRUE` (or uses a Tutors already answering on port 5173) and prints the link, such as `http://localhost:5173/course/127.0.0.1:8190`. Every change to the course's files rebuilds it: the command prints `… Studio is updating this course…`, then `Tutors is up to date: rebuilt in 0.3 seconds.` (or why it didn't build). Reload the page in your browser to see it. Ctrl+C stops the server, and Tutors if the command started it ([ADR 0042](../adr/0042-a-live-course-in-the-lecturers-own-tutors.md)).

## Checking and fixing

```sh
pnpm headless ~/courses/web-development            # check: every finding, then "Everything checks out." (exit 0) or the count (exit 1)
pnpm headless ~/courses/web-development fix        # apply Fix all safe, then check
```

## Arranging and details

```sh
pnpm headless <course> arrange "reorder topic-01 lab-02 talk-01"
pnpm headless <course> arrange "move topic-01/lab-02 topic-02"
pnpm headless <course> arrange "retitle topic-01/talk-01 How the web works"
pnpm headless <course> arrange "hide topic-03"        # or "show topic-03"
pnpm headless <course> arrange "remove topic-01/lab-02"
pnpm headless <course> arrange "restore lab-02 topic-01"
pnpm headless <course> details                        # print title, credits and start date
pnpm headless <course> details "title=Web Dev|credits=A. Lecturer|start=2026-09-14"
pnpm headless <course> picture topic-01 ~/Pictures/week1.png
pnpm headless <course> outcomes                       # the outcomes and the map of where each is served, with its flags
pnpm headless <course> outcomes "Understand: Students can explain how a web page is built|Apply: Students can build a page with a form"
pnpm headless <course> tag topic-01/lab-01 LO1,LO2    # or "none" to take them off
pnpm headless <course> history                        # changes this run applied
pnpm headless <course> undo [change-id]               # put back the latest change, or the one named
```

## Quizzes

```sh
pnpm headless <course> quiz topic-01/quiz-01               # the quiz as the designer opens it
pnpm headless <course> add-quiz topic-01 form.json         # a new quiz in a week, from the designer's form as JSON
pnpm headless <course> save-quiz topic-01/quiz-01 form.json
```

## Saving and publishing

```sh
pnpm headless <course> save                          # check, and add the standard setup it lacks
pnpm headless <course> save-website ~/Desktop        # build with tutors-lite, saved as <course>-website
NETLIFY_AUTH_TOKEN=... pnpm headless <course> publish web-dev-2026
pnpm headless <course> changes                       # what changed since the last publish
```

`publish` and `save-website` need Deno, or the Tutors tools program that `TUTORS_TOOLS` names (`pnpm bundle tools <your copy of tutors-mono-repo at the pinned commit>` compiles it). A `.env` file in the folder you run from can hold `NETLIFY_AUTH_TOKEN`, and a real environment variable wins over it.

## Git hand-off

```sh
pnpm headless <course> ignore-build                  # add json/ to the course's .gitignore
pnpm headless <course> push "Week 3 slides"          # add, commit and push with this computer's git
```

## Exit codes

`0` for success or a clean check, `1` when the course has errors or a change was blocked, `2` for a command Studio doesn't know (it lists the ones it does).
