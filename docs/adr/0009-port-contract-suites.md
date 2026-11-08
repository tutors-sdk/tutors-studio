# 0009. Port contract suites run against every adapter

**Status:** Accepted
**Date:** 2026-11-08

## Context

Adapters are where the outside world disagrees with our assumptions: a file system that overwrites on rename, a model that returns a suggestion with no evidence.

## Decision

Each port has one contract suite (tests/contract/) run against every adapter of that port. An adapter merges only when its port's suite passes. Model adapters run on recorded cassettes so CI stays deterministic.

## Consequences

fs/memory and fs/node run the FileSystemPort suite today; fs/tauri's guard and move semantics are tested in Rust (cargo test) and end to end in the journeys.

## Specified by

STU-0006
