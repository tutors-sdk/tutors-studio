# Vendored: @tutors/course-rules 0.1.0

Copied from tutors-sdk/tutors-mono-repo `packages/jsr/course-rules/src` at f48bc54 (`main` on 25 November 2026, after #592 merged: the rewiring planners `planReorder`, `planMove`, `planRetitle`, `planHide`, `planBin` and `planRestore`, with the fixes made in review: a path outside the course is refused, a moved item's ignore id is dropped, and a plan stops at a refused op), unchanged.

This is the interim allowed by ADR 0003 until `@tutors/course-rules` is published to JSR. When it is, delete this folder, add `"@tutors/course-rules": "jsr:<version>"` to package.json, and drop the alias in `vite.config.ts` and `tsconfig.json`. Never edit these files here: a change belongs upstream.
