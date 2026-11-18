import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error: a plain .mjs script run by the release workflow
import { isBeta, manifest, UPDATES } from "../../scripts/update-manifest.mjs";

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

  it("names the Tutors release inside, from tutors-bundle.json (ADR 0046)", () => {
    const { tutors } = JSON.parse(readFileSync("tutors-bundle.json", "utf8"));
    expect(manifest("0.2.0", "x", () => "sig", new Date(), tutors).tutors).toBe(tutors);
    expect(manifest("0.2.0", "x", () => "sig")).not.toHaveProperty("tutors");
  });

  it("tells a Beta from a Stable version by its hyphen, as the release workflow does (ADR 0046)", () => {
    expect(isBeta("0.4.0-beta.1")).toBe(true);
    expect(isBeta("0.4.0")).toBe(false);
    const workflow = readFileSync(".github/workflows/release.yml", "utf8");
    expect(workflow).toContain('*-*) kind="--prerelease"');
    expect(workflow).toContain("scripts/beta-channel.sh installers/beta.json");
    expect(readFileSync(".github/workflows/beta-channel.yml", "utf8")).toContain("scripts/beta-channel.sh");
  });

  it("puts beta.json where Beta copies of Studio read it", () => {
    expect(readFileSync("scripts/beta-channel.sh", "utf8")).toContain("gh release upload channel-beta");
    expect(readFileSync("src-tauri/src/updates.rs", "utf8")).toContain("/releases/download/channel-beta/beta.json");
  });
});
