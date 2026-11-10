# 0034. The Tutors command line is the last check before a course is saved or put online

**Status:** Accepted
**Date:** 2026-11-10

## Context

Leigh's decision on the next-phase document (9 Nov): "The Tutors CLI is the authority." Feature 14 asks for the rules from JSR rather than the vendored copy, and for `tutors validate --format json` as the gate at Save and Publish.

Studio checks the course at every step with `@tutors/course-rules`, vendored in `vendor/course-rules` until it is published. `tutors validate` lives in the upstream mono-repo (`packages/jsr/create/src/validate-cli.ts`) and prints the findings as a JSON array in the same `Finding` shape. Neither `@tutors/course-rules` nor a `@tutors/tutors` release that carries `validate` is on JSR yet (the latest, 5.3.0, has no `validate`), and running an older `tutors` with an unknown command would not check anything.

## Decision

- `CourseBuildPort` gains `validate()` and `validates`. The Tutors generator adapter runs the pinned command line, `deno run -A --node-modules-dir=none <TUTORS_VALIDATOR> validate . --format json`, in the course folder with Deno, or with Deno in a container, the same way it builds. It reads the findings from the report; exit 3, or anything that isn't a report, is a failure with the last lines it printed.
- Save, Save as a website and Publish run it last, after Studio's own check, before anything is written, built or sent (STU-0117). An error it reports stops the step, and the lecturer sees the rules' own words for it (STU-0118). Studio writes no copy for a finding.
- `TUTORS_VALIDATOR` in `src/domain/publish.ts` is the pin. It is null until a `@tutors/tutors` release carries `validate`; while it is null the gate is skipped and Studio's own check, with the same rules, is the whole check. Setting it is a one-line change with the release.
- The vendored rules are replaced by a pinned `jsr:@tutors/course-rules` import in the same change that first publishes it; `vendor/` stays unchanged until then.

## Consequences

- Once pinned, what Studio accepts is what `tutors validate` and the tutors-validate GitHub Action accept, even if the copy inside Studio is older.
- The gate costs one Deno run per Save or Publish (cached by Deno after the first).
- Saving needs Deno, Docker or Podman once the pin is set; until then saving needs no tools (ADR 0030).
