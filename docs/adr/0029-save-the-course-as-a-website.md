# 0029. Saving the course as a website: tutors-lite, copied to a folder the lecturer picks

**Status:** Accepted
**Date:** 2026-11-09

## Context

Leigh: "publish is not the outcome to netlify, it would be good to have this saved and exported on the file system". Until now, Publish had two ends: a reader in containers on this computer (ADR 0019), which goes away when it stops, and Netlify. Neither leaves the lecturer with something of their own to keep. Tutors already has the answer: tutors-lite (`jsr:@tutors/tutors-lite`) builds a course as a folder of plain web pages that opens in any browser, with no reader.

## Decision

- **Build:** `CourseBuildPort` gains `buildWebsite()`. The tutors-gen adapter runs tutors-lite the same way it runs `tutors`, with Deno or with Deno in a container, pinned at `jsr:@tutors/tutors-lite@5.3.0`. It writes into the course's `html/` folder, which the generator owns as `json/` is (ADR 0019): generated output, never the lecturer's files. Rust's `run_tool` allows that one pinned call too.
- **Save:** a new driven port, `SaveCopyPort`, copies a generated folder out of the course into a new folder named `<course>-website` in a folder the lecturer picks. If that name is taken it uses `-2`, `-3` and so on, so an earlier website is never overwritten. In the app, Studio's Rust `save_copy` does the copy. It reads only inside the open course, copies files and folders but not links, and makes the folder name itself. The headless CLI uses `node:fs` (`save-website <parent folder>`). The browser preview has no adapter, so the option isn't shown.
- **Errors fail:** saving refuses a course with errors, as publishing does. Leigh's "Errors should fail" applies to anything students might read.
- **After saving:** Studio shows the website in its folder (opener's `reveal_item_in_dir`, the one new capability) rather than opening a `file://` link.

## Consequences

The website's pages load Tutors' styles from a CDN, so they look right online and plainer offline. A course made before tutors-create's `.gitignore` listed `/html/` would commit that folder on step 9's push. New courses already leave it out.

## Specified by

STU-0087 and STU-0088 (`spec/features/publishing.feature`).
