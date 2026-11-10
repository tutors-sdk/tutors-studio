/** The drag type Studio's own items carry, so a drag of files from the desktop is never read as a rearrangement. */
export const DRAGGED = "application/x-tutors-studio-path";

/** The course path a drop carries, or null for anything not dragged from inside Studio. */
export const draggedPath = (event: DragEvent): string | null => (event.dataTransfer?.types.includes(DRAGGED) ? event.dataTransfer.getData(DRAGGED) : null);

/** The drag type an entry from My files carries (feature 5): its path and kind in the lecturer's own folder, as JSON. */
export const OWN = "application/x-tutors-studio-own";

/** The My files entry a drop carries, or null for anything else. */
export function ownEntry(event: DragEvent): { name: string; path: string; kind: "file" | "dir" } | null {
  if (!event.dataTransfer?.types.includes(OWN)) return null;
  try {
    return JSON.parse(event.dataTransfer.getData(OWN)) as { name: string; path: string; kind: "file" | "dir" };
  } catch {
    return null;
  }
}
