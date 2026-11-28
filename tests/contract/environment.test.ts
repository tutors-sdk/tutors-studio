import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TUTORS_GENERATOR, WEBSITE_GENERATOR } from "../../src/domain/publish.ts";
import { INSIDE_READER_PORT, READER_CSP, READER_FALLBACK } from "../../src/domain/live-tutors.ts";
import { LIBRARY_PORT, LIBRARY_PORTS, mergeLibraryVisits, type LibraryVisit, type ReaderVisit } from "../../src/domain/library-tutors.ts";

/** The script library_tutors.rs runs in the Tutors window, with `library` in place of its JSON. */
function rustListScript(library: LibraryVisit[]): string {
  const rust = readFileSync("src-tauri/src/library_tutors.rs", "utf8");
  const format = /pub fn list_script[\s\S]*?format!\(\s*"([\s\S]*?)"\s*\)/.exec(rust)?.[1] ?? "";
  return format
    .replace(/\\\r?\n\s*/g, "")
    .replaceAll("{{", "\u0000")
    .replaceAll("}}", "\u0001")
    .replace("{library}", JSON.stringify(library))
    .replaceAll("\u0000", "{")
    .replaceAll("\u0001", "}");
}

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

  it("serves library courses on the domain's ports and lists them as mergeLibraryVisits does (ADR 0068)", () => {
    const rust = readFileSync("src-tauri/src/library_tutors.rs", "utf8");
    expect(rust).toContain(`const LIBRARY_PORT: u16 = ${LIBRARY_PORT};`);
    expect(rust).toContain(`const LIBRARY_PORTS: u16 = ${LIBRARY_PORTS};`);
    const visits: ReaderVisit[] = [
      { id: "tutors-reference", title: "Reference", credits: "x", lastVisit: "2026-01-01T00:00:00.000Z", visits: 3 },
      { id: "127.0.0.1:8301", title: "Gone", credits: "In your library: Teaching/gone", lastVisit: "2026-01-01T00:00:00.000Z", visits: 0 },
      { id: "127.0.0.1:8300", title: "Old title", credits: "y", lastVisit: "2026-01-02T00:00:00.000Z", visits: 1, favourite: true },
    ];
    const library: LibraryVisit[] = [
      { id: "127.0.0.1:8300", title: "Web Development", credits: "In your library: Teaching/web-dev" },
      { id: "127.0.0.1:8302", title: "Mobile Apps", credits: "In your library: Teaching/mobile" },
    ];
    const store: Record<string, string> = { courseVisits: JSON.stringify(visits), studioLibrary: JSON.stringify(["127.0.0.1:8300", "127.0.0.1:8301"]) };
    let reloads = 0;
    const run = () => new Function("localStorage", "location", rustListScript(library))(store, { reload: () => (reloads += 1) });
    run();
    const listed = JSON.parse(store.courseVisits) as ReaderVisit[];
    const expected = mergeLibraryVisits(visits, library, ["127.0.0.1:8300", "127.0.0.1:8301"], String(listed.at(-1)?.lastVisit));
    expect(listed).toEqual(expected.visits);
    expect(JSON.parse(store.studioLibrary)).toEqual(expected.ids);
    expect(reloads).toBe(1);
    // The same library again changes nothing, so the page doesn't reload.
    run();
    expect(reloads).toBe(1);
  });

  it("runs no containers (ADR 0044)", () => {
    expect(readFileSync("src-tauri/src/tool.rs", "utf8")).not.toMatch(/"docker"\s*\|\s*"podman"\s*=>/);
  });

  it("no longer allows the retired local reader (ADR 0031)", () => {
    const rust = readFileSync("src-tauri/src/tool.rs", "utf8");
    expect(rust).not.toMatch(/tutors-reader|caddy/);
  });
});
