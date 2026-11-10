/**
 * Writing a page in plain language: the lecturer writes with headings, bold, lists, links, pictures,
 * code, tables, maths and diagrams, and Studio keeps the page as markdown (ADR 0026, feature 11). Some markdown has no plain-writing form, and
 * opening it there would drop it on save; this names what, so the page stays with the markdown editor. Pure.
 */

/** Fenced code blocks hold anything, so the checks below look only outside them. */
const withoutCode = (markdown: string): string => markdown.replace(/^(\s*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, "").replace(/`[^`\n]*`/g, "");

const checks: [RegExp, string][] = [
  [/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^>]*)?\/?>/, "HTML"],
  // A table plain writing keeps, but not the alignment its columns are given (feature 11).
  [/^\s*\|?[\s|:-]*(:-{3,}|-{3,}:)[\s|:-]*$/m, "a table with aligned columns"],
  [/\[\^[^\]]+\]/, "footnotes"],
  [/^\s{0,3}\[[^\]^]+\]:\s*\S+/m, "links defined at the bottom of the page"],
  [/^\s*[-*+]\s+\[[ xX]\]\s/m, "a checklist"],
];

/**
 * A page's settings between --- lines at the top (a lab step's icon, say), and the writing after them.
 * Plain writing edits only the writing; the settings are kept as they were. `settings` is "" when there are none.
 */
export function splitSettings(markdown: string): { settings: string; writing: string } {
  const found = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)(\s*\n)?/.exec(markdown);
  return found === null ? { settings: "", writing: markdown } : { settings: found[0], writing: markdown.slice(found[0].length) };
}

/** Why this page can't be written plainly without losing part of it, in the lecturer's words; null when it can. */
export function plainWritingProblem(markdown: string): string | null {
  const text = withoutCode(splitSettings(markdown).writing);
  const found = checks.filter(([pattern]) => pattern.test(text)).map(([, what]) => what);
  if (found.length === 0) return null;
  const list = found.length === 1 ? found[0] : `${found.slice(0, -1).join(", ")} and ${found[found.length - 1]}`;
  return `This page has ${list}, which plain writing can't keep. Turn on Advanced mode in Settings to edit its markdown instead.`;
}
