# 0015. The companion is moment-driven, not model-driven

**Status:** Accepted
**Date:** 2026-11-08

## Context

A helper character is where taste goes wrong fastest: Clippy interrupted, opened modals, and was hard to dismiss.

## Decision

A deterministic moments table (src/application/companion/moments.ts) decides when the companion speaks: a trigger, one sentence from messages, one action and a cool-down. A bound model may enrich a moment's words but never create one. At most one bubble, no modals, one click to hide, silent while the lecturer types or drags, a static pose under reduced motion.

## Consequences

The companion behaves identically with the none adapter, and a property test fires every trigger against every state.

## Specified by

(rules land with the companion)
