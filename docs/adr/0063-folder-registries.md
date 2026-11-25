# 0063. Folder registries: sharing under a licence, stored by digest

**Status:** Accepted
**Date:** 2026-11-25
**Builds on:** ADRs 0004, 0061, 0062
**Part of:** "Tutors Studio: a content registry", phase R2

## Context

The registry design gives every registry, local or hosted, one layout of plain files, so a registry can be a folder on a shared drive or a USB stick before anything is hosted. Leigh's answers to the design: share at the level of one item, no default licence, "build the local version now", always copy, and the lecturer is the only persona.

The library (ADR 0061) only reads. Sharing is the first time Studio writes outside a course it has open, so it needs its own port.

## Decision

- **The layout.** A folder registry holds `registry.json` (format and name), `catalogue.json` (the latest version of each entry, for browsing), `index/<publisher>/<name>.json` (every version of one entry) and `items/<sha256>/...` (one folder's files, as plain files). Entries and publishers are slugs. A version names its licence, title, kind, the course it came from, its stored folders with their digests, and the weeks and items that can be picked from it, by their paths in the course.
- **Share** (STU-0271). On the Library screen, **Share** on a ready course shares the whole course or one of its items into a folder the lecturer picks; an empty folder starts a registry. Studio shows one plan, the next version of the entry, and writes nothing until it is accepted. The plan is applied whole through `applyPlan` (ADR 0004), over a file system that reads through the `LibraryPort` and writes through the new `RegistryPort`.
- **A licence, always** (STU-0272). Nothing is shared without an SPDX identifier or expression. Studio suggests common ones, CC-BY-4.0 first in the list, and picks none.
- **Stored once** (STU-0273). A whole course is stored as its root files plus one folder for each top-level folder (the side unit, each unit); one item as its own folder. Each is stored under the SHA-256 of its files, paths and bytes in path order, the digest `.tutors/sources.json` already uses. A folder already in the registry is not written again, whichever entry or version holds it.
- **Never shared** (STU-0274): hidden files and folders, `node_modules`, Tutors' build output (`json`, `html`, `_site`), `calendar.yaml`, `enrollment.yaml` and `netlify.toml`. The plan names what it left out.
- **Registries in the library** (STU-0275). A library folder holding `registry.json` is a registry: Studio lists each entry at its latest version, with its licence, as ready, and does not search inside it. Its items are picked like any course's.
- **The digest is checked** (STU-0276). Composing from a registry reads the stored folder that holds the pick and copies nothing if its files no longer match their digest.
- **Only ready courses** (STU-0277), and never an entry already in a registry.
- **Credit** (STU-0278). The sources record keeps the entry, version and licence of each item copied from a registry, and the Borrowed material page names them.
- **`RegistryPort`** has `write(folder, path, bytes)` and `remove(folder, path)` (to undo a failed share). Adapters: `registry/tauri` (Rust `registry_write` and `registry_remove`, which write only into a folder holding `registry.json`, or the `registry.json` that starts one, through `fs::resolve`), `registry/node` (the same guard over node:fs) and `registry/memory` (the browser preview's registry, called Shared).
- `pnpm headless share <library folder> --course <course> [--item <item>] --to <registry folder> --publisher ... --licence ... [--name ...]` shares the same way.

## Consequences

- A hosted registry is the same layout served over HTTPS; reading one is a later step, as are signing, yanking and a review process (Leigh: "who reviews it is not relevant now").
- Studio does not yet tell a lecturer that a newer version of something they copied is available; the sources record holds what that needs.
- A registry folder can be edited by hand. Studio notices only when what it is about to copy no longer matches its digest.
