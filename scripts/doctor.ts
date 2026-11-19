// `pnpm run doctor` (plain `pnpm doctor` is pnpm's own check of itself): what this computer needs to build and run Studio, checked one by one, with the fix for
// anything missing (design doc, "For contributors"). Required: Node, pnpm, Rust and the system's webview
// build tools. Optional: Deno at the pinned version (only to compile the Tutors tools) and git.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export interface Probe {
  platform: NodeJS.Platform;
  /** A command's first line of output, or null when it isn't there or fails. */
  run(command: string, args: string[]): string | null;
  exists(path: string): boolean;
  env: NodeJS.ProcessEnv;
  nodeVersion: string;
}

export interface Finding {
  name: string;
  ok: boolean;
  /** What was found, or what to do. */
  detail: string;
  required: boolean;
}

const major = (version: string) => Number(/(\d+)/.exec(version)?.[1] ?? 0);
const versionIn = (text: string | null) => /(\d+\.\d+(?:\.\d+)?)/.exec(text ?? "")?.[1] ?? null;
const atLeast = (version: string, floor: string) => {
  const [a, b] = [version, floor].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  return true;
};

const RUSTUP = { win32: "the installer from https://rustup.rs", other: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" };
const LINUX_LIBRARIES = ["webkit2gtk-4.1", "librsvg-2.0", "openssl", "dbus-1"];

/** Every check for this computer, in the order a newcomer would fix them. */
export function diagnose(probe: Probe, pins: { node: string; deno: string; rust: string }): Finding[] {
  const found: Finding[] = [];
  const add = (name: string, ok: boolean, detail: string, required = true) => found.push({ name, ok, detail, required });

  const node = probe.nodeVersion.replace(/^v/, "");
  add(
    "Node",
    major(node) >= major(pins.node) || atLeast(node, "22.12"),
    atLeast(node, "22.12") ? `Node ${node}` : `Node ${node} is too old: install Node ${pins.node} (nvm install, or nodejs.org)`,
  );

  const pnpm = versionIn(probe.run("pnpm", ["--version"]));
  add("pnpm", pnpm !== null, pnpm ? `pnpm ${pnpm}` : "No pnpm: run corepack enable");

  const rust = versionIn(probe.run("rustc", ["--version"]));
  const cargo = probe.run("cargo", ["--version"]) !== null;
  const rustup = probe.platform === "win32" ? RUSTUP.win32 : RUSTUP.other;
  if (rust === null || !cargo) add("Rust", false, `No Rust: install it with ${rustup}, then open a new terminal`);
  else add("Rust", atLeast(rust, pins.rust), atLeast(rust, pins.rust) ? `Rust ${rust}` : `Rust ${rust} is older than ${pins.rust}: run rustup update`);

  if (probe.platform === "win32") {
    const vswhere = `${probe.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)"}\\Microsoft Visual Studio\\Installer\\vswhere.exe`;
    const tools = probe.exists(vswhere)
      ? probe.run(vswhere, ["-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "displayName"])
      : null;
    add("C++ build tools", Boolean(tools), tools ? tools : 'No C++ build tools: install Visual Studio Build Tools with "Desktop development with C++"');
    const webview = probe.run("reg", ["query", "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}", "/v", "pv"]);
    add(
      "WebView2",
      webview !== null,
      webview ? `WebView2 ${versionIn(webview) ?? ""}`.trim() : "No WebView2 runtime: install it from https://developer.microsoft.com/microsoft-edge/webview2/",
    );
  } else if (probe.platform === "darwin") {
    const xcode = probe.run("xcode-select", ["-p"]);
    add("Xcode command line tools", xcode !== null, xcode ? xcode : "No Xcode command line tools: run xcode-select --install");
  } else {
    const missing = LINUX_LIBRARIES.filter((library) => probe.run("pkg-config", ["--exists", library]) === null);
    add(
      "Webview build libraries",
      missing.length === 0,
      missing.length === 0
        ? LINUX_LIBRARIES.join(", ")
        : `Missing ${missing.join(", ")}: sudo apt install build-essential libwebkit2gtk-4.1-dev librsvg2-dev libssl-dev libdbus-1-dev`,
    );
  }

  const deno = versionIn(probe.run("deno", ["--version"]));
  add(
    "Deno (only for pnpm bundle tools)",
    deno === pins.deno,
    deno === pins.deno
      ? `Deno ${deno}`
      : deno
        ? `Deno ${deno}, but tutors-bundle.json pins ${pins.deno}: deno upgrade --version ${pins.deno}`
        : `No Deno: install ${pins.deno} from https://deno.com if you compile the Tutors tools`,
    false,
  );
  const git = versionIn(probe.run("git", ["--version"]));
  add("git (only for Commit and push)", git !== null, git ? `git ${git}` : "No git: install it from https://git-scm.com", false);
  return found;
}

/** The report a newcomer reads, and whether everything required is there. */
export function report(findings: Finding[]): { text: string; ok: boolean } {
  const lines = findings.map((finding) => `${finding.ok ? "ok  " : finding.required ? "MISS" : "skip"}  ${finding.name}: ${finding.detail}`);
  const ok = findings.every((finding) => finding.ok || !finding.required);
  lines.push("", ok ? "Ready: pnpm install, then pnpm tauri dev." : "Fix the MISS lines above, then run pnpm run doctor again.");
  return { text: lines.join("\n"), ok };
}

const probe: Probe = {
  platform: process.platform,
  run(command, args) {
    try {
      return (
        execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" && command === "pnpm" })
          .split("\n")[0]
          .trim() || ""
      );
    } catch {
      return null;
    }
  },
  exists: existsSync,
  env: process.env,
  nodeVersion: process.version,
};

if (process.argv[1]?.endsWith("doctor.ts")) {
  const cargo = readFileSync("src-tauri/Cargo.toml", "utf8");
  const pins = {
    node: readFileSync(".nvmrc", "utf8").trim(),
    deno: (JSON.parse(readFileSync("tutors-bundle.json", "utf8")) as { deno: string }).deno,
    rust: /rust-version\s*=\s*"([^"]+)"/.exec(cargo)?.[1] ?? "1.77.2",
  };
  const { text, ok } = report(diagnose(probe, pins));
  console.log(text);
  process.exitCode = ok ? 0 : 1;
}
