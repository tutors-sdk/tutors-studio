# 0033. In-app updates

**Status:** Accepted
**Date:** 2026-11-10

## Context

ADR 0017 left in-app updates for later: "the Tauri updater plugin, which needs its own signing key and an update-offer screen the lecturer accepts". The next-phase document makes it a release enabler for the first tagged release: "tag it, sign the macOS and Windows installers, add auto-update". The update key is Leigh's to create and keep, like the Apple and Windows certificates, so it cannot be in the repository.

## Decision

- **Tauri's updater plugin, pinned** (`tauri-plugin-updater` =2.14.1, `@tauri-apps/plugin-updater` 2.14.1, with `tauri-plugin-process` =2.4.0 to restart). Studio reads `latest.json` from the latest GitHub release; each update is checked against the public half of the update key before it is installed.
- **Only a build that carries the key has an updater.** The release workflow writes the updater's configuration (public key, endpoint, `createUpdaterArtifacts`) as a `--config` overlay only when the `TAURI_SIGNING_PRIVATE_KEY` secret and the `TAURI_UPDATER_PUBKEY` variable exist; `lib.rs` registers the plugin only when that configuration is present. Any other build, and the browser preview, says Studio can't update itself and links to the download page (STU-0110).
- **A new driven port, `UpdatesPort`** (`version`, `check`, `install`), with a Tauri adapter and a none adapter. The `createUpdates` use case keeps the offer; `accept` installs only an offer the lecturer was shown (STU-0109, STU-0111).
- **Nothing happens on its own.** Studio never checks or downloads in the background: Settings has "Check for a newer version", and installing is a second press naming the version. This keeps ADR 0004's spirit (nothing changes without the lecturer's say) for Studio itself.
- The release job writes `latest.json` with `scripts/update-manifest.mjs`: the universal macOS `.app.tar.gz` for both Mac kinds, the Windows setup and the Linux AppImage, each with its `.sig`. A release missing a signature fails rather than shipping a half-updatable release.

## Consequences

- Until Leigh creates the key (`pnpm tauri signer generate`) and adds it (docs/releasing.md), every release behaves as before, and lecturers update by downloading.
- The .deb and the MSI do not update themselves; Tauri updates the AppImage, the per-user Windows setup and the macOS app. Lecturers on those get the download link when they check.
- Losing the private key means existing copies can no longer update; they must download once with a new key.
