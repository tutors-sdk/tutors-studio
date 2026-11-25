import { describe, expect, it } from "vitest";
import { indexPath, isLicence, itemsFolder, neverShared, registryName, storedFolderOf, withEntry, type RegistryIndex } from "../../src/domain/registry.ts";

const version = (n: number, title = "Web Development") => ({
  version: n,
  published: "2026-11-25",
  licence: "CC-BY-4.0",
  title,
  kind: "course",
  from: "Web Development",
  folders: [],
  items: [],
});

describe("folder registries", () => {
  it("stores a folder under its digest and an entry under its publisher", () => {
    expect(itemsFolder("sha256:abc")).toBe("items/abc");
    expect(indexPath("leigh", "web-dev")).toBe("index/leigh/web-dev.json");
    expect(registryName("Leigh Griffin's Labs!")).toBe("leigh-griffin-s-labs");
  });

  it("never shares hidden files, build output, the term's dates, students or hosting settings", () => {
    for (const path of [
      ".env",
      ".git/config",
      "node_modules/x/a.js",
      "json/tutors.json",
      "html/index.html",
      "_site/a",
      "calendar.yaml",
      "enrollment.yaml",
      "netlify.toml",
      "topic-01/.DS_Store",
    ])
      expect(neverShared(path), path).toBe(true);
    for (const path of ["course.md", "properties.yaml", "topic-01/topic.md", "topic-01/json/data.json", "topic-01/lab-01/calendar.yaml"])
      expect(neverShared(path), path).toBe(false);
  });

  it("reads SPDX identifiers and expressions as licences, and nothing else", () => {
    for (const licence of ["CC-BY-4.0", "MIT", "MIT OR Apache-2.0", "GPL-2.0-only WITH Classpath-exception-2.0", "LicenseRef-college"])
      expect(isLicence(licence), licence).toBe(true);
    for (const licence of ["", "free to use", "MIT or Apache-2.0", "-x"]) expect(isLicence(licence), licence).toBe(false);
  });

  it("keeps the latest version of each entry in the catalogue, ordered by name", () => {
    const first: RegistryIndex = { name: "web-dev", publisher: "leigh", versions: [version(1)] };
    const other: RegistryIndex = { name: "agile", publisher: "leigh", versions: [version(1, "Agile")] };
    const catalogue = withEntry(withEntry(withEntry({ format: 1, entries: [] }, first), other), { ...first, versions: [version(1), version(2, "Web Dev II")] });
    expect(catalogue.entries.map((entry) => [entry.name, entry.version, entry.title])).toEqual([
      ["agile", 1, "Agile"],
      ["web-dev", 2, "Web Dev II"],
    ]);
  });

  it("finds the stored folder that holds an item, the deepest first", () => {
    const folders = [
      { path: "", digest: "sha256:root" },
      { path: "unit-1", digest: "sha256:unit" },
      { path: "unit-1/topic-01", digest: "sha256:topic" },
    ];
    expect(storedFolderOf(folders, "unit-1/topic-01/lab-01")).toEqual({ folder: folders[2], rest: "lab-01" });
    expect(storedFolderOf(folders, "unit-1")).toEqual({ folder: folders[1], rest: "" });
    expect(storedFolderOf(folders, "unit-10/topic-01")).toBeNull();
  });
});
