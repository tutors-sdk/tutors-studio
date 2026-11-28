/**
 * Back and Home on every Studio screen (STU-0325). Each layer is something open over the start screen, the
 * topmost first: Settings, a folder being loaded, the library, a new course, a pane over the course, a week or
 * item chosen in it, then the course itself. Back closes the topmost, as its own Close or Back would; Home closes them all.
 */
export interface Layer {
  open: boolean;
  close: () => void;
}

/** Whether anything is open over the start screen. Pure. */
export const canGoBack = (layers: readonly Layer[]): boolean => layers.some((layer) => layer.open);

/** Closes the topmost open layer. */
export function goBack(layers: readonly Layer[]): void {
  layers.find((layer) => layer.open)?.close();
}

/** Closes every open layer, back to the start screen. */
export function goHome(layers: readonly Layer[]): void {
  for (const layer of layers) if (layer.open) layer.close();
}
