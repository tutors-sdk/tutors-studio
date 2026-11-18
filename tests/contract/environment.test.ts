import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TUTORS_GENERATOR, WEBSITE_GENERATOR } from "../../src/domain/publish.ts";
import { INSIDE_READER_PORT, READER_CSP, READER_FALLBACK } from "../../src/domain/live-tutors.ts";

describe("what lives in two places stays in step", () => {
  it("the Rust allowlist pins the same generators the adapters run (both from tutors-bundle.json, ADR 0043)", () => {
    const rust = readFileSync("src-tauri/src/bundle.rs", "utf8");
    expect(readFileSync("src-tauri/src/tool.rs", "utf8")).toContain("use crate::bundle::{GENERATOR, WEBSITE_GENERATOR};");
    for (const pinned of [TUTORS_GENERATOR, WEBSITE_GENERATOR]) expect(rust).toContain(`"${pinned}"`);
  });

  it("serves the reader inside Studio as the domain says, on the same port, page and policy (ADR 0045)", () => {
    const rust = readFileSync("src-tauri/src/live.rs", "utf8");
    expect(rust).toContain(`const INSIDE_READER_PORT: u16 = ${INSIDE_READER_PORT};`);
    expect(rust).toContain(`pub const READER_FALLBACK: &str = "${READER_FALLBACK}";`);
    expect(rust).toContain(`pub const READER_CSP: &str = "${READER_CSP}";`);
  });

  it("runs no containers (ADR 0044)", () => {
    expect(readFileSync("src-tauri/src/tool.rs", "utf8")).not.toMatch(/"docker"\s*\|\s*"podman"\s*=>/);
  });

  it("no longer allows the retired local reader (ADR 0031)", () => {
    const rust = readFileSync("src-tauri/src/tool.rs", "utf8");
    expect(rust).not.toMatch(/tutors-reader|caddy/);
  });
});
