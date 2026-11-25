# Vendored: part of @tutors/tutors-create 5.3.0

`src/generate.ts`, `pattern-course.ts`, `patterns.ts`, `templates.ts`, `types.ts` and `import-course.ts`, copied from tutors-sdk/tutors-mono-repo `packages/jsr/create/src` at fb826a8 (upstream PRs #581 patterns, #582 import and the fixes stacked on them, up to #588: a lecturer-shaped week), unchanged. They are the course generator: Studio's three-question start writes exactly the files `tutors create --pattern` writes, and an accepted import lays out exactly what `tutors import` would.

The same interim as vendor/course-rules (ADR 0003): when a `@tutors/tutors-create` with patterns is on JSR, delete this folder, depend on `jsr:@tutors/tutors-create` and drop the alias. Never edit these files here.

`src/archive.ts` and `src/course-archive.ts`, copied from tutors-sdk/tutors-mono-repo PR #612 (issue #611, `tutors import` reads a Moodle backup or a Common Cartridge) at e95b89c, unchanged, with Leigh's agreement on 19 November 2026 (ADR 0056). They are the course export reader Studio's "Load a course" uses.
