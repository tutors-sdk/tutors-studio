# Vendored: part of @tutors/tutors-create 5.3.0

`src/generate.ts`, `pattern-course.ts`, `patterns.ts`, `templates.ts`, `types.ts` and `import-course.ts`, copied from tutors-sdk/tutors-mono-repo `packages/jsr/create/src` at 8277887358ceaaeb750ce21f41140fc1fe676842 (upstream PRs #581 patterns and #582 import), unchanged. They are the course generator: Studio's three-question start writes exactly the files `tutors create --pattern` writes, and an accepted import lays out exactly what `tutors import` would.

The same interim as vendor/course-rules (ADR 0003): when a `@tutors/tutors-create` with patterns is on JSR, delete this folder, depend on `jsr:@tutors/tutors-create` and drop the alias. Never edit these files here.
