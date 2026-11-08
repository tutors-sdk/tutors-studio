/** What checking one diagram found: it draws, it won't (and where Mermaid stopped), or the checker can't tell here. */
export type DiagramCheck = { draws: true } | { draws: false; line?: number; unknownType?: boolean } | { draws: "unknown" };

/** A diagram drawn for the lecturer to look at, or nothing when it won't draw. */
export type DiagramDrawing = { ok: true; svg: string } | { ok: false };

/**
 * Driven port: the diagram library the reader draws with (ADR 0018). Optional: without one, Studio
 * neither checks nor draws diagrams.
 */
export interface DiagramPort {
  check(source: string): Promise<DiagramCheck>;
  draw(source: string): Promise<DiagramDrawing>;
}
