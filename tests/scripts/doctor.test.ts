import { describe, expect, it } from "vitest";
import { diagnose, report, type Probe } from "../../scripts/doctor.ts";

const pins = { node: "26", deno: "2.9.6", rust: "1.77.2" };
const computer = (platform: NodeJS.Platform, answers: Record<string, string | null>, nodeVersion = "v26.1.0"): Probe => ({
  platform,
  run: (command, args) => (command in answers ? answers[command] : (answers[`${command} ${args.join(" ")}`] ?? null)),
  exists: () => true,
  env: {},
  nodeVersion,
});
const ready = { pnpm: "11.24.0", rustc: "rustc 1.97.0 (abc 2026-10-01)", cargo: "cargo 1.97.0", deno: "deno 2.9.6 (stable)", git: "git version 2.50.1" };

describe("pnpm run doctor", () => {
  it("is ready on a Windows computer with everything", () => {
    const findings = diagnose(
      computer("win32", {
        ...ready,
        "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe": "Visual Studio Build Tools 2022",
        reg: "    pv    REG_SZ    156.0.4314.58",
      }),
      pins,
    );
    expect(findings.map((f) => [f.name, f.ok])).toEqual([
      ["Node", true],
      ["pnpm", true],
      ["Rust", true],
      ["C++ build tools", true],
      ["WebView2", true],
      ["Deno (only for pnpm bundle tools)", true],
      ["git (only for Commit and push)", true],
    ]);
    expect(findings.find((f) => f.name === "WebView2")?.detail).toBe("WebView2 156.0.4314");
    expect(report(findings)).toEqual({ ok: true, text: expect.stringContaining("Ready: pnpm install, then pnpm tauri dev.") });
  });

  it("names the fix for each thing a new Windows computer lacks", () => {
    const findings = diagnose(computer("win32", {}, "v20.1.0"), pins);
    const { text, ok } = report(findings);
    expect(ok).toBe(false);
    expect(text).toContain("MISS  Node: Node 20.1.0 is too old: install Node 26");
    expect(text).toContain("MISS  pnpm: No pnpm: run corepack enable");
    expect(text).toContain("MISS  Rust: No Rust: install it with the installer from https://rustup.rs, then open a new terminal");
    expect(text).toContain('MISS  C++ build tools: No C++ build tools: install Visual Studio Build Tools with "Desktop development with C++"');
    expect(text).toContain("MISS  WebView2: No WebView2 runtime");
    expect(text).toContain("skip  Deno (only for pnpm bundle tools): No Deno: install 2.9.6");
    expect(text).toContain("skip  git (only for Commit and push): No git");
    expect(text).toContain("Fix the MISS lines above");
  });

  it("is ready without the optional tools, and says when Deno isn't the pinned one", () => {
    const findings = diagnose(
      computer("darwin", { pnpm: ready.pnpm, rustc: ready.rustc, cargo: ready.cargo, "xcode-select": "/Library/Developer/CommandLineTools", deno: "deno 2.8.0" }, "v22.12.0"),
      pins,
    );
    expect(report(findings).ok).toBe(true);
    expect(findings.find((f) => f.name.startsWith("Deno"))?.detail).toBe("Deno 2.8.0, but tutors-bundle.json pins 2.9.6: deno upgrade --version 2.9.6");
  });

  it("finds an old Rust, and the Linux libraries that are missing", () => {
    const findings = diagnose(computer("linux", { ...ready, rustc: "rustc 1.70.0", "pkg-config --exists webkit2gtk-4.1": "", "pkg-config --exists openssl": "" }), pins);
    expect(findings.find((f) => f.name === "Rust")).toMatchObject({ ok: false, detail: "Rust 1.70.0 is older than 1.77.2: run rustup update" });
    expect(findings.find((f) => f.name === "Webview build libraries")).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/^Missing librsvg-2\.0, dbus-1: sudo apt install/),
    });
    expect(report(findings).ok).toBe(false);
  });

  it("is missing the Mac's tools without xcode-select", () => {
    expect(diagnose(computer("darwin", ready), pins).find((f) => f.name === "Xcode command line tools")).toMatchObject({
      ok: false,
      detail: "No Xcode command line tools: run xcode-select --install",
    });
  });
});
