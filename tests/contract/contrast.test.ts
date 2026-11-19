import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * WCAG 2.1 AA contrast for Studio's text tokens (PRODUCT.md promises AA; design doc, "For contributors"): every
 * pair of text and the surface it sits on reaches 4.5:1, in light and dark, in the default look and each look a
 * lecturer can choose that changes colours. Read from src/ui/paper-tokens.css, so a token change that breaks a
 * pair fails here. Disabled text is exempt, as WCAG allows.
 */
const css = readFileSync("src/ui/paper-tokens.css", "utf8");

/** The custom properties set in each rule whose selector is exactly the one given, in order. */
const declarations = (selector: string): Record<string, string> => {
  const found: Record<string, string> = {};
  for (const [, body] of css.matchAll(new RegExp(`(?:^|\\n)${selector.replace(/[[\]"]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "g")))
    for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) found[name] = value.trim();
  return found;
};

type Hex = string;
function resolve(tokens: Record<string, string>, value: string, side: 0 | 1): Hex {
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const pair = /^light-dark\((.*)\)$/s.exec(v);
  if (pair) {
    let depth = 0;
    const at = [...pair[1]].findIndex((char) => (char === "(" ? (depth++, false) : char === ")" ? (depth--, false) : char === "," && depth === 0));
    return resolve(tokens, side === 0 ? pair[1].slice(0, at) : pair[1].slice(at + 1), side);
  }
  const variable = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  if (variable && tokens[variable[1]]) return resolve(tokens, tokens[variable[1]], side);
  throw new Error(`Can't read a colour from ${v}`);
}

const luminance = (hex: Hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: Hex, b: Hex) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS: [string, string][] = [
  ["--ui-ink", "--ui-canvas"],
  ["--ui-ink", "--ui-surface"],
  ["--ui-ink", "--ui-raised"],
  ["--ui-ink", "--ui-selected"],
  ["--ui-muted", "--ui-canvas"],
  ["--ui-muted", "--ui-surface"],
  ["--ui-brand", "--ui-canvas"],
  ["--ui-brand", "--ui-surface"],
  ["--ui-on-brand", "--ui-brand"],
  ["--ui-danger", "--ui-surface"],
  ["--ui-success", "--ui-surface"],
  ["--ui-info", "--ui-surface"],
  ["--ui-warning", "--ui-surface"],
];

const base = declarations(":root");
const looks: [string, Record<string, string>][] = [
  ["the default look", base],
  ["plain letters for dyslexia", { ...base, ...declarations(':root[data-dyslexia="plain"]') }],
  ["high contrast", { ...base, ...declarations(':root[data-contrast="high"]') }],
];

describe("text contrast (WCAG 2.1 AA, 4.5:1)", () => {
  it("measures as WCAG does", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  for (const [look, tokens] of looks)
    for (const [side, name] of [
      [0, "light"],
      [1, "dark"],
    ] as const)
      it(`reaches 4.5:1 for every text token in ${look}, ${name}`, () => {
        const short = PAIRS.map(([text, ground]) => ({
          pair: `${text} on ${ground}`,
          ratio: Number(contrast(resolve(tokens, tokens[text], side), resolve(tokens, tokens[ground], side)).toFixed(2)),
        })).filter(({ ratio }) => ratio < 4.5);
        expect(short).toEqual([]);
      });
});
