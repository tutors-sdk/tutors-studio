import mermaid from "mermaid";
import type { DiagramCheck, DiagramDrawing, DiagramPort } from "../../../application/ports/diagrams.ts";

interface ParseError {
  hash: { loc: { first_line: number } };
}
const isParseError = (error: unknown): error is ParseError => typeof error === "object" && error !== null && typeof (error as ParseError).hash?.loc?.first_line === "number";

let initialised = false;
let drawn = 0;

function ready() {
  if (!initialised) mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
  initialised = true;
  return mermaid;
}

/**
 * DiagramPort over Mermaid, the version the reader draws with. A parse error names the line it stopped
 * at; an unknown first line is said as such; any other failure (a diagram type that needs a browser,
 * under Node) is "unknown", so nothing is reported that the reader would draw.
 */
export const mermaidDiagrams: DiagramPort = {
  async check(source: string): Promise<DiagramCheck> {
    try {
      await ready().parse(source);
      return { draws: true };
    } catch (error: unknown) {
      if (isParseError(error)) return { draws: false, line: error.hash.loc.first_line };
      if (error instanceof Error && error.name === "UnknownDiagramError") return { draws: false, unknownType: true };
      return { draws: "unknown" };
    }
  },
  async draw(source: string): Promise<DiagramDrawing> {
    try {
      const { svg } = await ready().render(`studio-diagram-${++drawn}`, source);
      return { ok: true, svg };
    } catch {
      return { ok: false };
    }
  },
};
