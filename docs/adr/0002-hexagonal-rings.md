# 0002. Hexagonal rings enforced by dependency-cruiser

**Status:** Accepted
**Date:** 2026-11-08

## Context

Studio will be driven by a window, a headless CLI and later an MCP server, and will talk to several models. Without enforced boundaries, adapter code leaks into use cases and the drivers drift apart.

## Decision

Four rings: src/domain imports nothing; src/application (use cases and the eight port interfaces) imports only the domain; src/adapters/<port>/<impl> imports the application, the domain and one external SDK, never another adapter or the UI; src/ui calls use cases through AuthoringPort. The composition roots (src/main.ts for the app, src/headless.ts for the CLI) are the only places an adapter is named. .dependency-cruiser.cjs encodes these rules and `pnpm architecture` gates every PR.

## Consequences

Adding a capability means adding or extending a port first. A driver that needs something another driver has goes through AuthoringPort, so the window, the CLI and MCP stay interchangeable.

## Specified by

STU-0001, STU-0007
