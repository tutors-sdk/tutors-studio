# 0006. Remote assistants require per-course opt-in

**Status:** Accepted
**Date:** 2026-11-08

## Context

A lecturer's slides and notes may not be theirs to send to a third party, and a lecturer may not realise a model call leaves the machine.

## Decision

An adapter whose capabilities say local: false sends no course content until the lecturer opts in for that course. The opt-in is shown on the Check screen every time, and a PDF's text never leaves the machine without it.

## Consequences

Opt-ins are stored per course root in settings. The companion's "Remote opt-in" moment asks at the point of need.

## Specified by

(rules land with the first remote adapter)
