import { canHold, dropAction, findFolder, type ArrangeAction, type Arrangeable, type DropPlace } from "../domain/arrange.ts";

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

/** The course path being dragged inside this window, read while dragging, when a drag's data can't be. */
let current: string | null = null;

/** Starts dragging a course item. */
export function startDrag(event: DragEvent, path: string): void {
  event.dataTransfer?.setData(DRAGGED, path);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  current = path;
}

export const endDrag = (): void => void (current = null);

/** Whether a drag carries files from the computer. */
export const carriesFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes("Files") ?? false;

/**
 * Where the item being dragged would land on `row`, and what that asks for: inside it when the row can hold
 * it, else just above or below by which half of the row the pointer is over (STU-0144, STU-0145). Null when
 * the drop would change nothing.
 */
export function dropOver(event: DragEvent, root: Arrangeable, row: { path: string }): { place: DropPlace; action: ArrangeAction } | null {
  if (current === null) return null;
  const item = findFolder(root, current);
  const onto = findFolder(root, row.path);
  if (item === undefined || onto === undefined) return null;
  const inside = canHold(onto.kind, item.kind);
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const place: DropPlace = inside ? "into" : event.clientY < box.top + box.height / 2 ? "before" : "after";
  const action = dropAction(root, current, row.path, place);
  return action === null ? null : { place, action };
}
