# 0007. Studio is an MCP server, not (yet) a client

**Status:** Accepted; client role deferred
**Date:** 2026-11-08

## Context

Claude Code and other agents could build a course for a lecturer if Studio exposed its use cases; they must not be able to do anything a lecturer could not.

## Decision

A ToolHostPort adapter will expose the AuthoringPort use cases as MCP tools over stdio and localhost HTTP, with JSON schemas generated from the UI's types. plan.apply is the only writer and requires a plan id from a previous call; no tool exposes raw file writes. Studio does not consume other MCP servers in v1.

## Consequences

An agent's pending plan appears on the Check screen exactly like a lecturer's drop. A change to any tool schema needs an ADR.

## Specified by

(rules land with the MCP adapter)
