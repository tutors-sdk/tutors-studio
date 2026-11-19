import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A size ceiling for Svelte components (design doc, "For contributors"): a screen that grows past it is split
 * by screen. The two that were already over it when the ceiling came in may only shrink; each figure here is
 * lowered as they are split, and the entry goes once they are under the ceiling.
 */
const CEILING = 600;
const SHRINKING: Record<string, number> = {
  "src/ui/App.svelte": 1017,
  "src/ui/components/NodeDetail.svelte": 734,
};

const components = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? components(join(dir, entry.name)) : entry.name.endsWith(".svelte") ? [join(dir, entry.name)] : [],
  );
const lines = (file: string) => readFileSync(file, "utf8").replace(/\n$/, "").split("\n").length;

describe("the size ceiling for components", () => {
  const sizes = Object.fromEntries(components("src/ui").map((file) => [file.replaceAll("\\", "/"), lines(file)]));

  it(`keeps every component at ${CEILING} lines or fewer`, () => {
    const over = Object.entries(sizes).filter(([file, size]) => size > CEILING && !(file in SHRINKING));
    expect(over, "Split these by screen (CONTRIBUTING.md)").toEqual([]);
  });

  it("lets the components already over it only shrink", () => {
    for (const [file, most] of Object.entries(SHRINKING)) expect(sizes[file], `${file} may not grow past ${most} lines`).toBeLessThanOrEqual(most);
  });

  it("drops a component from the shrinking list once it is under the ceiling", () => {
    for (const file of Object.keys(SHRINKING)) expect(sizes[file], `${file} is under ${CEILING} lines: take it off the list`).toBeGreaterThan(CEILING);
  });
});
