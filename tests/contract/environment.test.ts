import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TUTORS_GENERATOR, WEBSITE_GENERATOR } from "../../src/domain/publish.ts";

describe("what lives in two places stays in step", () => {
  it("the Rust allowlist pins the same generators the adapters run (both from tutors-bundle.json, ADR 0043)", () => {
    const rust = readFileSync("src-tauri/src/bundle.rs", "utf8");
    expect(readFileSync("src-tauri/src/tool.rs", "utf8")).toContain("use crate::bundle::{GENERATOR, WEBSITE_GENERATOR};");
    for (const pinned of [TUTORS_GENERATOR, WEBSITE_GENERATOR]) expect(rust).toContain(`"${pinned}"`);
  });

  it("runs no containers (ADR 0044)", () => {
    expect(readFileSync("src-tauri/src/tool.rs", "utf8")).not.toMatch(/"docker"\s*\|\s*"podman"\s*=>/);
  });

  it("no longer allows the retired local reader (ADR 0031)", () => {
    const rust = readFileSync("src-tauri/src/tool.rs", "utf8");
    expect(rust).not.toMatch(/tutors-reader|caddy/);
  });
});
