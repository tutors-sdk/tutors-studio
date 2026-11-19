import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captions } from "../../scripts/film.ts";
import { siteTokens } from "../../scripts/front-door.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const downloads = (text: string) => [...text.matchAll(/https:\/\/github\.com\/tutors-sdk\/tutors-studio\/releases\/latest\/download\/[\w.-]+/g)].map(([link]) => link);

describe("the front door (ADR 0054)", () => {
  const page = read("site/index.html");

  it("offers the same downloads as docs/install.md", () => {
    expect(new Set(downloads(page))).toEqual(new Set(downloads(read("docs/install.md"))));
    expect(downloads(page)).toHaveLength(4);
  });

  it("says there is nothing else to install, on the page and at the end of the film", () => {
    expect(page).toContain("Nothing else to install.");
    expect(captions.at(-1)).toContain("Nothing else to install.");
  });

  it("plays the film recorded by pnpm front-door, with its transcript", () => {
    expect(page).toContain('src="film/web-development-2.mp4"');
    expect(page).toContain('src="film/web-development-2.webm"');
    expect(page).toContain("What the film shows");
  });

  it("takes every colour from the tokens", () => {
    expect(read("site/site.css")).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
  });

  it("makes the tokens' font addresses relative, so the page works under any path", () => {
    const tokens = siteTokens(read("src/ui/paper-tokens.css"));
    expect(tokens).toContain('url("fonts/Inter-Variable.woff2")');
    expect(tokens).not.toContain('url("/fonts/');
  });
});
