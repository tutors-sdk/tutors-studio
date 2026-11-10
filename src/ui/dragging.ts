/** The drag type Studio's own items carry, so a drag of files from the desktop is never read as a rearrangement. */
export const DRAGGED = "application/x-tutors-studio-path";

/** The course path a drop carries, or null for anything not dragged from inside Studio. */
export const draggedPath = (event: DragEvent): string | null => (event.dataTransfer?.types.includes(DRAGGED) ? event.dataTransfer.getData(DRAGGED) : null);
