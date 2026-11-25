# 0064. Registries on Google Drive

**Status:** Accepted
**Date:** 2026-11-25
**Builds on:** ADRs 0016, 0061, 0062, 0063
**Part of:** "Tutors Studio: a content registry", the first hosted registry

## Context

The registry design put a GitHub-backed registry first among hosted ones. Leigh chose Google Drive instead: "Start them so we have the capability of doing it, use google drive as a starting point" (2026-11-25). Lecturers' departments already share teaching in Drive, and a Drive folder can be shared with colleagues without anything new to run.

A folder registry (ADR 0063) is plain files at plain paths, and Drive holds files in folders, so the same layout fits. What differs is the transport: Drive is reached over HTTPS by file id, and needs the lecturer's Google sign-in.

## Decision

- **A Drive folder is a library folder.** Studio keeps it as `gdrive:<folder id>/<name>`, which the library shows as "Google Drive: <name>". It is added by pasting the folder's link (Share, then Copy link) under **Add a Google Drive folder** (STU-0279, STU-0282). Everything that reads a library folder (search, check, compose) and writes a registry (share) works on it unchanged (STU-0280). The share panel's **Use a Google Drive folder** picks a Drive registry the same way.
- **One adapter, `registry/google-drive`**, implements the `LibraryPort` and the `RegistryPort` over Drive's v3 HTTP API with `fetch` and no Google SDK. Paths are resolved by listing each folder's children, cached until Studio writes there. A write creates folders as needed and replaces a file that already exists. Google Docs, Sheets and Slides have no bytes, so they are never listed as files. As on the disk, it writes only into a folder that holds `registry.json`, or writes that file to start one (STU-0283). `routedLibrary` and `routedRegistry` send each folder to the disk or to Drive by its name. Shared drives are included.
- **A new port, `DriveAccountPort`**: whether Studio is signed in, a pasted token, signing out, the browser sign-in, and a folder's name for the library.
- **Sign-in.** With Studio's Google OAuth client id in the build (`VITE_GOOGLE_CLIENT_ID`, and `VITE_GOOGLE_CLIENT_SECRET`, which Google does not treat as secret for a desktop app), **Sign in to Google** opens Google's page. It uses PKCE and a loopback redirect: the Rust side (`oauth_loopback_start` and `oauth_loopback_wait`) listens on 127.0.0.1, on a port the system picks, for five minutes and one answer. Studio checks the `state` it sent and exchanges the code. The access and refresh tokens go in the keychain as `google-drive-token` (ADR 0016), and the access token is refreshed before it expires. Without a client id, the lecturer pastes an access token. The headless CLI reads one from `GOOGLE_DRIVE_TOKEN`.
- **Scope: full Drive** (`https://www.googleapis.com/auth/drive`). A registry is usually a folder a colleague shared, which Studio did not create, so `drive.file` can't open it. Studio still reads and writes only the folders the lecturer added.
- **Signed out or refused** (STU-0281). With no sign-in, or a token Google refuses, Studio reads nothing from Drive and says to sign in. The library reports that folder as unread and still searches the others.
- The Tauri CSP allows `connect-src` to `www.googleapis.com` and `oauth2.googleapis.com`.

## Consequences

- Leigh, or an owner of the Google Cloud project, must create a **Desktop app** OAuth client with the Drive API enabled, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as repository variables for the release build. Until Google verifies the app (the Drive scope is restricted), sign-in works only for the test users listed on the consent screen, up to 100.
- Drive has no digest or version of its own that Studio relies on. The digests in the registry index still catch a stored folder changed by hand (STU-0276).
- A GitHub-backed registry and a hosted service remain possible later. They would be further adapters behind the same two ports.
