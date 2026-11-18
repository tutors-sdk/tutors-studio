# 0046. Updates on opening, and two channels

**Status:** Accepted
**Date:** 2026-11-18
**Amends:** [0033](0033-in-app-updates.md)

## Context

ADR 0033 had Studio check for a newer version only when the lecturer pressed **Check for a newer version** in Settings. The bundled-release design (the Studio design doc, phase 1, B4) asks for more, because Studio now carries its own Tutors (ADRs 0043 to 0045) and a lecturer who never opens Settings would keep an old Tutors for a whole term: check when Studio opens, offer the update where the lecturer is, let them keep Studio up to date without asking, and let early adopters take a Beta that is tested on Windows first. It must still never change Studio mid-task, and never install something it couldn't verify.

## Decision

- **Check when Studio opens, at most once a day** (STU-0179). The check downloads nothing. A newer version shows a small card on any screen, naming the Studio and Tutors versions it holds, with **Update now** and **Later** (STU-0180). Settings keeps **Check for a newer version**.
- **Keep Studio up to date, off by default** (STU-0183). When on, Studio downloads a newer version in the background on opening and installs it when Studio closes. Off, nothing is downloaded until **Update now**.
- **Never while busy** (STU-0181). `studioBusy` in the application ring counts work in progress: `applyPlan`, and saving, building and publishing a course. Neither **Update now** nor closing installs while it is set.
- **Download, then install** (STU-0182). The port splits `install` into `download(progress)` and `install(restart)`. The Rust side keeps the downloaded bytes and installs only those. Tauri's updater checks the signature as it downloads. One that fails is thrown away, the offer is dropped, and the lecturer is told the update couldn't be checked.
- **Two channels, Stable and Beta.** Stable reads `latest.json` from `releases/latest`, as before. Beta reads `beta.json` from a rolling pre-release tagged `channel-beta`. A tag with a hyphen (`v0.4.0-beta.1`) is a Beta: the release workflow publishes it straight away as a pre-release, which `releases/latest` never names, and puts its manifest on `channel-beta`. When a maintainer publishes a Stable draft, `beta-channel.yml` copies its `latest.json` to `channel-beta`, so a Beta copy is offered the newest of either.
- **The manifest names the Tutors inside**: `scripts/update-manifest.mjs` adds `tutors` from `tutors-bundle.json`, and the offer says "Studio 0.4.0 is ready, with Tutors 17.2.0 inside."
- The channel, the keep setting and the last check time are settings (`updateChannel`, `keepUpToDate`, `lastUpdateCheck`).

## Consequences

- A Stable release published after a newer Beta (a fix to 0.3 after 0.4.0-beta.1, say) points the Beta channel back at it, and a Beta copy sees nothing newer until the next Beta or Stable. Tag the next Beta after such a fix.
- Beta copies go first, so Windows journeys (B5) must pass before a Beta tag; a Beta with a bad build reaches only those who chose it.
- The check on opening needs the network once a day. Offline, it fails quietly and tries again on the next opening.
