import type { DroppedFile } from "../domain/material.ts";

/**
 * The files a lecturer dropped or chose, folders walked, with paths relative to what was dropped
 * ("Week 3/Lecture.pdf"). Browser APIs only, so it works the same in the desktop app's WebView.
 */
export async function droppedFiles(transfer: DataTransfer): Promise<DroppedFile[]> {
  const entries = [...transfer.items].map((item) => item.webkitGetAsEntry?.() ?? null);
  if (entries.length === 0 || entries.some((entry) => entry === null)) return fromFiles([...transfer.files]);
  const files: DroppedFile[] = [];
  for (const entry of entries) await walk(entry!, "", files);
  return files;
}

/** Files from a file picker: `webkitRelativePath` keeps a chosen folder's structure. */
export async function fromFiles(list: File[]): Promise<DroppedFile[]> {
  return Promise.all(list.map(async (file) => ({ path: file.webkitRelativePath || file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
}

async function walk(entry: FileSystemEntry, prefix: string, into: DroppedFile[]): Promise<void> {
  const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    into.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) });
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns at most 100 entries a call; read until it returns none.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) break;
    for (const child of batch) await walk(child, path, into);
  }
}
