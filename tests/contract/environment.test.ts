import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DENO_IMAGE } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { TUTORS_GENERATOR, WEBSITE_GENERATOR } from "../../src/domain/publish.ts";

describe("what lives in two places stays in step", () => {
  it("the Rust allowlist pins the same image and generators the adapters run", () => {
    const rust = readFileSync("src-tauri/src/tool.rs", "utf8");
    for (const pinned of [DENO_IMAGE, TUTORS_GENERATOR, WEBSITE_GENERATOR]) expect(rust).toContain(`"${pinned}"`);
  });

  it("no longer allows the retired local reader (ADR 0031)", () => {
    const rust = readFileSync("src-tauri/src/tool.rs", "utf8");
    expect(rust).not.toMatch(/tutors-reader|caddy/);
  });
});
