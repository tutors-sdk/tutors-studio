# Releasing Studio

For maintainers. Lecturers read [install.md](install.md).

## Make a release

1. Set the same version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`, and merge.
2. Tag main: `git tag v0.2.0 && git push origin v0.2.0`. The release workflow refuses a tag that does not match the version.
3. The workflow builds the installers, installs and opens each one on a clean macOS, Windows (setup and MSI), Ubuntu 22.04 and Ubuntu 24.04 machine, and only then drafts a release with one plainly named file per computer, `SHA256SUMS.txt`, and the notes from [release-notes.md](release-notes.md).
4. Read the draft and publish it. The permanent links in install.md (`releases/latest/download/…`) point at it from then on.

A pull request that changes `src-tauri/`, the release workflow or dependencies runs step 3's build and install check without releasing, so a broken installer is caught before merge.

## In-app updates

Studio updates itself once an update key exists (ADR 0033); until then Settings sends lecturers to the download page.

1. Make the key once, on your own computer: `pnpm tauri signer generate -w ~/.tauri/tutors-studio.key`, with a password. Keep the private key and password safe: copies of Studio already installed can only take updates signed with it.
2. In the repository's Actions settings, add the secrets `TAURI_SIGNING_PRIVATE_KEY` (the private key file's contents) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and the variable `TAURI_UPDATER_PUBKEY` (the `.pub` file's contents).
3. The next tagged release builds with the updater, signs the macOS app, the Windows setup and the AppImage, and adds `latest.json`. A lecturer on that release or later sees the version after it under Settings, Updates, and installs it with one press.

## Signing

Studio ships unsigned for its first term (ADR 0017). This section is ready for when that changes.

Signing removes the "could not verify" and "Windows protected your PC" steps for lecturers. The workflow signs by itself once the secrets below exist in the repository's Actions secrets, and the install check then also requires the signature to pass Gatekeeper.

### macOS (Apple Developer Program)

| Secret                       | Value                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`          | The "Developer ID Application" certificate exported as .p12, base64-encoded (`base64 -i cert.p12`) |
| `APPLE_CERTIFICATE_PASSWORD` | The password chosen when exporting the .p12                                                        |
| `APPLE_SIGNING_IDENTITY`     | `Developer ID Application: <Name> (<TEAMID>)`                                                      |
| `APPLE_ID`                   | The Apple ID email of the developer account                                                        |
| `APPLE_PASSWORD`             | An app-specific password for that Apple ID (appleid.apple.com, Sign-In and Security)               |
| `APPLE_TEAM_ID`              | The ten-character team id                                                                          |

With all six set, Tauri signs the app, notarises it with Apple and staples the ticket, so the disk image opens with no warning.

### Windows

Not wired yet: it depends on which signing route is chosen (ADR 0017). Until then Windows shows SmartScreen's **More info**, **Run anyway** once, which install.md explains.
