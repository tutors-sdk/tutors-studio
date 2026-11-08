# 0008. EARS is the specification layer

**Status:** Accepted
**Date:** 2026-11-08

## Context

The monorepo specifies behaviour as EARS Rules bound to Gherkin scenarios, gated by an audit. Studio should be reviewable the same way.

## Decision

Every behaviour is an EARS sentence with a permanent STU- id in spec/ears/, the same sentence is a tagged Rule in spec/features/, and spec/steps/ binds it with vitest-cucumber (the monorepo's runner, issue #214). Scenarios drive the headless adapter, not the UI. `pnpm ears:audit` fails a PR whose register, features and steps disagree.

## Consequences

No feature PR without its STU- sentences. The monorepo's ears-dashboard can be pointed at this repo so coverage of the register is one number.

## Specified by

all STU- ids
