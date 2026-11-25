/**
 * Google Drive folders in the library (ADR 0064): a library folder or registry Studio reaches through the Drive
 * API instead of the disk, written "gdrive:<folder id>/<name>" so the library shows its name.
 */

export const DRIVE_PREFIX = "gdrive:";

/** A Drive folder as the library keeps it. Pure. */
export const driveFolder = (id: string, name: string): string => `${DRIVE_PREFIX}${id}/${name.replaceAll("/", "-").trim() || "Google Drive"}`;

/** Whether a library folder is on Google Drive. Pure. */
export const isDriveFolder = (folder: string): boolean => folder.startsWith(DRIVE_PREFIX);

/** The Drive folder id of a library folder; null for a folder on this computer. Pure. */
export function driveFolderId(folder: string): string | null {
  if (!isDriveFolder(folder)) return null;
  const id = folder.slice(DRIVE_PREFIX.length).split("/")[0];
  return id === "" ? null : id;
}

/**
 * The folder id in what a lecturer pastes: a folder's link ("https://drive.google.com/drive/folders/<id>",
 * with or without "u/0/" and "?usp=sharing"), an "open?id=<id>" link, or the bare id. Null when it is none. Pure.
 */
export function folderIdFromLink(text: string): string | null {
  const trimmed = text.trim();
  const found = /\/folders\/([A-Za-z0-9_-]{10,})/.exec(trimmed) ?? /[?&]id=([A-Za-z0-9_-]{10,})/.exec(trimmed) ?? /^([A-Za-z0-9_-]{10,})$/.exec(trimmed);
  return found ? found[1] : null;
}

/** How the library names a folder: its path on this computer, or "Google Drive: <name>". Pure. */
export const folderLabel = (folder: string): string => (isDriveFolder(folder) ? `Google Drive: ${folder.slice(folder.indexOf("/") + 1)}` : folder);
