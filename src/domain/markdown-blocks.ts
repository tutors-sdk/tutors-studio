/**
 * Blocks a lecturer inserts while writing (feature 11): each arrives as the markdown Tutors reads and stays
 * text in Studio, which never draws a diagram or the maths. Pure.
 */

/** The first lines of a new diagram: one Mermaid knows, for the lecturer to change. */
export const DIAGRAM_STARTER = "flowchart TD\n  Start --> Finish";

/** A new maths block's first line, in the TeX the reader's KaTeX draws. */
export const MATHS_STARTER = "E = mc^2";

/** Languages offered for a code block, by the names lecturers use; any other name is kept as typed. */
export const CODE_LANGUAGES = ["python", "javascript", "typescript", "java", "c", "html", "css", "bash", "sql", "json", "yaml"] as const;

const ALIASES: Record<string, string> = { js: "javascript", ts: "typescript", py: "python", sh: "bash", shell: "bash", yml: "yaml" };

/** A code block's language as its fence names it: lower case, no spaces, common short names spelt out; "" for none. */
export function codeLanguage(typed: string): string {
  const word = typed.trim().toLowerCase().replace(/\s+/g, "-");
  return ALIASES[word] ?? word;
}
