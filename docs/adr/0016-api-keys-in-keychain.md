# 0016. API keys live in the OS keychain, never in SettingsPort

**Status:** Accepted
**Date:** 2026-11-08

## Context

Hosted assistants need API keys; a settings database is easy to copy, sync or attach to a bug report.

## Decision

Keys go to the OS keychain through the keychain adapter. SettingsPort persists only the adapter id and model name.

## Consequences

A settings export or a telemetry log can never carry a key.

## Specified by

(rules land with the first hosted adapter)
