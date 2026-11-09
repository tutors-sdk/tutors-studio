/**
 * Writing a page in plain language: the lecturer writes with headings, bold, lists, links, pictures and
 * code, and Studio keeps the page as markdown (ADR 0026). Some markdown has no plain-writing form, and
 * opening it there would drop it on save; this names what, so the page stays with the markdown editor. Pure.
 */

/** Fenced code blocks hold anything, so the checks below look only outside them. */
const withoutCode = (markdown: string): string => markdown.replace(/^(\s*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, "").replace(/`[^`\n]*`/g, "");

const checks: [RegExp, string][] = [
  [/^﻿?---\r?\n/, "settings at the top between --- lines"],
  [/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^>]*)?\/?>/, "HTML"],
  [/^\s*\|?\s*:?-{3,}:?\s*\|/m, "a table"],
  [/\[\^[^\]]+\]/, "footnotes"],
  [/^\s{0,3}\[[^\]^]+\]:\s*\S+/m, "links defined at the bottom of the page"],
  [/^\s*[-*+]\s+\[[ xX]\]\s/m, "a checklist"],
  [/\$\$/, "maths"],
];

/** Why this page can't be written plainly without losing part of it, in the lecturer's words; null when it can. */
export function plainWritingProblem(markdown: string): string | null {
  const text = markdown.startsWith("---") || markdown.startsWith("﻿---") ? markdown : withoutCode(markdown);
  const found = checks.filter(([pattern]) => pattern.test(text)).map(([, what]) => what);
  if (found.length === 0) return null;
  const list = found.length === 1 ? found[0] : `${found.slice(0, -1).join(", ")} and ${found[found.length - 1]}`;
  return `This page has ${list}, which plain writing can't keep. Turn on Advanced mode in Settings to edit its markdown instead.`;
}
