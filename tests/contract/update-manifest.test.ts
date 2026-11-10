import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error: a plain .mjs script run by the release workflow
import { manifest, UPDATES } from "../../scripts/update-manifest.mjs";

describe("the update manifest (ADR 0033)", () => {
  it("names each computer's signed update at its released address", () => {
    const found = manifest("0.2.0", "https://example.test/v0.2.0", (file: string) => `sig of ${file}`, new Date("2027-01-01T00:00:00Z"));
    expect(found.version).toBe("0.2.0");
    expect(found.platforms["darwin-aarch64"]).toEqual({ signature: "sig of Tutors-Studio-macOS.app.tar.gz", url: "https://example.test/v0.2.0/Tutors-Studio-macOS.app.tar.gz" });
    expect(found.platforms["darwin-x86_64"]).toEqual(found.platforms["darwin-aarch64"]);
    expect(found.platforms["windows-x86_64"].url).toBe("https://example.test/v0.2.0/Tutors-Studio-Windows-setup.exe");
    expect(found.platforms["linux-x86_64"].url).toBe("https://example.test/v0.2.0/Tutors-Studio-Linux.AppImage");
    expect(found.pub_date).toBe("2027-01-01T00:00:00.000Z");
  });

  it("refuses a release missing a signature", () => {
    expect(() => manifest("0.2.0", "x", (file: string) => (file.endsWith(".AppImage") ? null : "sig"))).toThrow(/no signature for Tutors-Studio-Linux.AppImage/);
  });

  it("names only files the release workflow publishes", () => {
    const workflow = readFileSync(".github/workflows/release.yml", "utf8");
    for (const { file } of UPDATES as { file: string }[]) expect(workflow).toContain(file);
  });

  it("is read from the address the app's updater is given", () => {
    const workflow = readFileSync(".github/workflows/release.yml", "utf8");
    expect(workflow).toContain('"/releases/latest/download/latest.json"');
  });
});
