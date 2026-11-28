// The Tutors inside Studio, from one file (ADR 0043, STU-0171 to STU-0173). tutors-bundle.json names the
// Tutors release, the generator, tutors-lite and Deno; the pins in src/domain/bundle.ts and
// src-tauri/src/bundle.rs are written from it, and every part the build downloads is checked against
// the SHA-256 it gives.
//
//   pnpm bundle pins            write the pins
//   pnpm bundle pins --check    fail if a pin differs from tutors-bundle.json
//   pnpm bundle fetch           download each part and check its SHA-256
//   pnpm bundle bump --release <tutors-release.json URL or file>  move the manifest and its pins to a newer Tutors
//                               release, with the reader file it carries (the manifest bot, ADR 0069)
//   pnpm bundle bump <tag> <commit> <generator> <tutors-lite>  the same for a release with no tutors-release.json (ADR 0055)
//   pnpm bundle cli             bundle Studio's command line (src/headless.ts) into tools/studio.mjs
//   pnpm bundle tools <folder> [target]  compile the Tutors tools program, with Studio's command line, from a
//                               tutors-mono-repo checkout at "reader.commit" into src-tauri/binaries (needs Deno;
//                               universal-apple-darwin also needs lipo)
//   pnpm bundle reader [folder] install the reader into src-tauri/resources/reader: the release's own reader file
//                               when the manifest names one (ADR 0069); else built in a tutors-mono-repo checkout at
//                               "reader.commit", fetched into .cache/ first with no folder (ADR 0066)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { build } from "esbuild";

/** A file the build downloads into the app, such as the static reader. */
export interface BundlePart {
  name: string;
  url: string;
  sha256: string;
  /** Where it goes, from the repository root. */
  file: string;
}

export interface Bundle {
  /** The tutors-mono-repo release inside: "17.1.0". */
  tutors: string;
  /** "@tutors/tutors@5.3.0" */
  generator: string;
  /** "@tutors/tutors-lite@5.3.0" */
  website: string;
  /** The Deno the tools run on. */
  deno: string;
  /**
   * The commit of tutors-mono-repo that the Tutors tools (ADR 0044) are built from, and the reader inside Studio
   * (ADR 0045) where the manifest names no reader part; with a reader part, the release's own reader file is
   * installed instead (ADR 0069), stamped with this commit.
   */
  reader: { repository: string; commit: string };
  parts: BundlePart[];
}

export const MANIFEST = "tutors-bundle.json";
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const PACKAGE = /^@tutors\/[a-z-]+@\d+\.\d+\.\d+$/;

/** The manifest, or the first thing wrong with it. */
export function parseBundle(text: string): Bundle {
  const bundle = JSON.parse(text) as Bundle;
  const wrong = (what: string) => {
    throw new Error(`${MANIFEST}: ${what}`);
  };
  if (!SEMVER.test(bundle.tutors ?? "")) wrong(`"tutors" must be a Tutors release such as "17.1.0"`);
  if (!SEMVER.test(bundle.deno ?? "")) wrong(`"deno" must be a Deno version such as "2.9.6"`);
  for (const key of ["generator", "website"] as const) if (!PACKAGE.test(bundle[key] ?? "")) wrong(`"${key}" must be a JSR package at a version, such as "@tutors/tutors@5.3.0"`);
  if (!/^[\w.-]+\/[\w.-]+$/.test(bundle.reader?.repository ?? "") || !/^[0-9a-f]{40}$/.test(bundle.reader?.commit ?? ""))
    wrong(`"reader" must name a repository ("owner/name") and a full commit to build the reader from`);
  if (!Array.isArray(bundle.parts)) wrong(`"parts" must be a list`);
  for (const part of bundle.parts) {
    if (!part.name || !/^https:\/\//.test(part.url ?? "")) wrong(`part "${part.name ?? "?"}" needs a name and an https url`);
    if (!/^[0-9a-f]{64}$/.test(part.sha256 ?? "")) wrong(`part "${part.name}" needs the SHA-256 of its file, 64 hex digits`);
    if (!part.file || part.file.includes("..")) wrong(`part "${part.name}" needs a file inside the repository`);
  }
  return bundle;
}

/** A tutors-mono-repo release as the manifest bot reads it: its tag's version, commit and the two JSR packages' versions. */
export interface TutorsRelease {
  tutors: string;
  commit: string;
  generator: string;
  website: string;
}

const newer = (a: string, b: string) => {
  const parts = (version: string) => version.split("-")[0].split(".").map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

/**
 * The manifest moved to a newer Tutors release (STU-0220): the release, the commit the reader and tools are
 * built from, and the generator and tutors-lite at the versions on its tag. Null when the release is not newer.
 */
export function bumpBundle(bundle: Bundle, release: TutorsRelease): Bundle | null {
  const tutors = release.tutors.replace(/^v/, "");
  if (!newer(tutors, bundle.tutors)) return null;
  return parseBundle(
    JSON.stringify({
      ...bundle,
      tutors,
      generator: `@tutors/tutors@${release.generator}`,
      website: `@tutors/tutors-lite@${release.website}`,
      reader: { ...bundle.reader, commit: release.commit },
    }),
  );
}

/**
 * The release manifest each tutors-mono-repo release carries, tutors-release.json (tutors-sdk/tutors-mono-repo#622,
 * ADR 0069): the Tutors version, the commit it was built from, its JSR packages and Deno, and its files with their
 * SHA-256. The manifest bot reads it from the release's own download URL.
 */
export interface TutorsReleaseManifest {
  schema: 1;
  tutors: string;
  tag: string;
  commit: string;
  repository: string;
  prerelease: boolean;
  generator: string;
  website: string;
  deno: string;
  parts: { name: string; asset: string; target?: string; url: string; sha256: string }[];
}

/** The part of a Tutors release Studio carries: the reader's static build (ADR 0045). */
export const READER_PART = "reader";

/** Where a downloaded release file waits before Studio unpacks it (ignored by git). */
export const PARTS_FOLDER = ".cache/parts";

/** A release manifest, or the first thing wrong with it (STU-0321). */
export function parseReleaseManifest(text: string): TutorsReleaseManifest {
  const release = JSON.parse(text) as TutorsReleaseManifest;
  const wrong = (what: string) => {
    throw new Error(`tutors-release.json: ${what}`);
  };
  if (release.schema !== 1) wrong(`schema ${String(release.schema)} is not one this Studio reads (1)`);
  if (!SEMVER.test(release.tutors ?? "")) wrong(`"tutors" must be a Tutors release such as "17.2.0"`);
  if (!/^[0-9a-f]{40}$/.test(release.commit ?? "")) wrong(`"commit" must be a full commit`);
  if (!/^[\w.-]+\/[\w.-]+$/.test(release.repository ?? "")) wrong(`"repository" must be "owner/name"`);
  for (const key of ["generator", "website"] as const) if (!PACKAGE.test(release[key] ?? "")) wrong(`"${key}" must be a JSR package at a version, such as "@tutors/tutors@5.4.0"`);
  if (!SEMVER.test(release.deno ?? "")) wrong(`"deno" must be a Deno version such as "2.9.6"`);
  if (!Array.isArray(release.parts)) wrong(`"parts" must be a list`);
  for (const part of release.parts) {
    if (!part.name || !/^[\w.-]+$/.test(part.asset ?? "") || !/^https:\/\//.test(part.url ?? "")) wrong(`part "${part.name ?? "?"}" needs a name, a file name and an https url`);
    if (!/^[0-9a-f]{64}$/.test(part.sha256 ?? "")) wrong(`part "${part.name}" needs the SHA-256 of its file, 64 hex digits`);
  }
  return release;
}

/**
 * The manifest moved to a Tutors release from its release manifest (STU-0321): its version, packages and
 * Deno, the commit Studio's Tutors tools are built from, and the release's reader file with its SHA-256 as
 * the reader part. Null when the release is not newer, or is a prerelease (Studio carries final releases).
 */
export function bundleFromRelease(bundle: Bundle, release: TutorsReleaseManifest): Bundle | null {
  if (release.prerelease || !newer(release.tutors, bundle.tutors)) return null;
  const reader = release.parts.find((part) => part.name === READER_PART);
  const parts = bundle.parts.filter((part) => part.name !== READER_PART);
  if (reader) parts.push({ name: READER_PART, url: reader.url, sha256: reader.sha256, file: `${PARTS_FOLDER}/${reader.asset}` });
  return parseBundle(
    JSON.stringify({
      ...bundle,
      tutors: release.tutors,
      generator: release.generator,
      website: release.website,
      deno: release.deno,
      reader: { repository: release.repository, commit: release.commit },
      parts,
    }),
  );
}

export const readBundle = (root = ".") => parseBundle(readFileSync(join(root, MANIFEST), "utf8"));

const HEADER = `Written by \`pnpm bundle pins\` from ${MANIFEST}. Change that file, not this one.`;

/** Each pin file, by its path from the repository root, as \`pnpm bundle pins\` writes it. */
export function pinsFor(bundle: Bundle): Record<string, string> {
  return {
    "src/domain/bundle.ts": `// ${HEADER}

/** The Tutors release inside this Studio. */
export const TUTORS_RELEASE = ${JSON.stringify(bundle.tutors)};
/** The Tutors generator Studio builds with. */
export const GENERATOR_PACKAGE = ${JSON.stringify(bundle.generator)};
/** The generator that builds a course as a website of its own. */
export const WEBSITE_PACKAGE = ${JSON.stringify(bundle.website)};
/** The Deno the Tutors tools run on. */
export const DENO_VERSION = ${JSON.stringify(bundle.deno)};
`,
    "src-tauri/src/bundle.rs": `//! ${HEADER}

/// The Tutors generator Studio may run.
pub const GENERATOR: &str = ${JSON.stringify(`jsr:${bundle.generator}`)};
/// The generator that builds a course as a website of its own (tutors-lite).
pub const WEBSITE_GENERATOR: &str = ${JSON.stringify(`jsr:${bundle.website}`)};
`,
    "tools/main.ts": `// ${HEADER}
//
// The Tutors tools program bundled beside Studio (ADR 0044): the generator and tutors-lite in one file,
// compiled with \`deno compile\` so a lecturer needs no Deno. \`pnpm bundle tools\` compiles it with the deno.json
// of a tutors-mono-repo checkout at the pinned commit, whose workspace answers the two Tutors imports, so the
// tools are the same Tutors as the reader inside Studio. Each package builds the course in the current folder
// when it is imported, as \`deno run jsr:...\` does. \`studio\` is Studio's own command line (src/headless.ts,
// bundled into tools/studio.mjs by \`pnpm bundle cli\`), which the installed \`tutors-studio\` command runs
// (ADR 0053).
const command = Deno.args[0];
if (command === "studio") {
  // Studio's command line reads process.argv after the program's own name, as under Node.
  const { argv } = await import("node:process");
  argv.splice(2, 1);
  await import("./studio.mjs");
} else if (command === "build") {
  await import("@tutors/tutors");
} else if (command === "website") {
  await import("@tutors/tutors-lite");
} else if (command === "--version") {
  console.log(${JSON.stringify(`tutors-tools: Tutors ${bundle.tutors}, ${bundle.generator}, ${bundle.website}, from ${bundle.reader.repository}@${bundle.reader.commit.slice(0, 7)}`)});
} else {
  console.error("Usage: tutors-tools build | website | studio <course folder> <command> | --version");
  Deno.exit(2);
}
`,
  };
}

/** Studio's command line as one file for the tools program (ADR 0053). */
export const STUDIO_CLI = "tools/studio.mjs";

/**
 * Bundles src/headless.ts, with every package it uses, into one ES module that Node and Deno both run: the
 * \`studio\` command of the tools program. Studio's version is written in, as \`pnpm headless\` reads it.
 */
export async function bundleStudioCli(outfile = STUDIO_CLI, root = "."): Promise<void> {
  const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
  await build({
    entryPoints: [join(root, "src/headless.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    outfile,
    logLevel: "warning",
    define: { "process.env.npm_package_version": JSON.stringify(version) },
    // Some packages inside still call require(); an ES module has none until it is made.
    banner: { js: 'import { createRequire as studioRequire } from "node:module"; const require = studioRequire(import.meta.url);' },
  });
}

/** The name Tauri gives the tools program for a target: "src-tauri/binaries/tutors-tools-x86_64-pc-windows-msvc.exe". */
export const toolsFile = (target: string) => `src-tauri/binaries/tutors-tools-${target}${target.includes("windows") ? ".exe" : ""}`;

/** Tauri's target for one Mac app that runs on Apple silicon and Intel, and the two it is made of. */
export const UNIVERSAL_MAC = "universal-apple-darwin";
export const MAC_TARGETS = ["aarch64-apple-darwin", "x86_64-apple-darwin"];

/** This computer's Rust target, which Tauri looks for in a sidecar's name. */
const hostTarget = () => /host: (\S+)/.exec(execFileSync("rustc", ["-vV"], { encoding: "utf8" }))?.[1] ?? "";

/** Where the reader's static files go for the installer (src-tauri/tauri.reader.conf.json). */
export const READER_FOLDER = "src-tauri/resources/reader";

/** The file in READER_FOLDER that names the commit the reader there was built from. */
export const READER_STAMP = ".studio-reader-commit";

/**
 * Whether the reader inside Studio is built for `pnpm tauri dev` (STU-0313): missing, built from another commit
 * than the manifest pins (or before the stamp existed), or ready.
 */
export function readerState(root = "."): "missing" | "stale" | "ready" {
  const folder = join(root, READER_FOLDER);
  if (!existsSync(join(folder, "200.html"))) return "missing";
  try {
    return readFileSync(join(folder, READER_STAMP), "utf8").trim() === readBundle(root).reader.commit ? "ready" : "stale";
  } catch {
    return "stale";
  }
}

/** Where `pnpm bundle reader` with no checkout keeps tutors-mono-repo at the pinned commit (ignored by git). */
export const PINNED_CHECKOUT = ".cache/tutors-mono-repo";

/** tutors-mono-repo at the commit the manifest builds from, fetched into PINNED_CHECKOUT the first time. */
function pinnedCheckout(bundle: Bundle): string {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: PINNED_CHECKOUT, stdio: "inherit" });
  if (!existsSync(join(PINNED_CHECKOUT, ".git"))) {
    mkdirSync(dirname(PINNED_CHECKOUT), { recursive: true });
    execFileSync("git", ["clone", "--filter=blob:none", "--no-checkout", `https://github.com/${bundle.reader.repository}.git`, PINNED_CHECKOUT], { stdio: "inherit" });
  } else git("fetch", "--quiet", "origin");
  git("checkout", "--quiet", "--force", bundle.reader.commit);
  return PINNED_CHECKOUT;
}

/** Throws unless the tutors-mono-repo checkout in \`folder\` is at the commit the manifest builds from. */
export function checkoutAtPin(folder: string | undefined, bundle: Bundle, command: string): string {
  if (!folder) throw new Error(`Name the tutors-mono-repo checkout: pnpm bundle ${command} <folder>`);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: folder, encoding: "utf8" }).trim();
  if (head !== bundle.reader.commit) throw new Error(`${folder} is at ${head}, but ${MANIFEST} builds Tutors from ${bundle.reader.commit}`);
  return folder;
}

/** The pin files that differ from what the manifest says. */
export function stalePins(root = "."): string[] {
  return Object.entries(pinsFor(readBundle(root)))
    .filter(([path, text]) => {
      try {
        // A Windows checkout may turn LF into CRLF; the pins are the same either way.
        return readFileSync(join(root, path), "utf8").replaceAll("\r\n", "\n") !== text;
      } catch {
        return true;
      }
    })
    .map(([path]) => path);
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Why a downloaded part can't go into the app, or null when it matches. */
export function partProblem(part: BundlePart, bytes: Uint8Array): string | null {
  const got = sha256(bytes);
  return got === part.sha256 ? null : `${part.name} (${part.url}) has SHA-256 ${got}, but ${MANIFEST} says ${part.sha256}`;
}

/** Downloads every part and writes it only if its SHA-256 matches. Throws, naming each part that doesn't. */
export async function fetchParts(bundle: Bundle, root = ".", get: typeof fetch = fetch): Promise<string[]> {
  const problems: string[] = [];
  const written: string[] = [];
  for (const part of bundle.parts) {
    const response = await get(part.url);
    if (!response.ok) {
      problems.push(`${part.name} (${part.url}) answered ${response.status}`);
      continue;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const problem = partProblem(part, bytes);
    if (problem) {
      problems.push(problem);
      continue;
    }
    mkdirSync(dirname(join(root, part.file)), { recursive: true });
    writeFileSync(join(root, part.file), bytes);
    written.push(part.file);
  }
  if (problems.length > 0) throw new Error(`The bundle can't be built:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  return written;
}

/**
 * Installs the reader the manifest's Tutors release carries (STU-0322): downloads the reader part, refuses it
 * unless its SHA-256 matches (STU-0323), unpacks it, and puts its static files in READER_FOLDER with the
 * stamp naming the release's commit. Builds nothing. The folder it unpacks, or one folder inside it, must hold
 * the reader's fallback page.
 */
export async function installReader(bundle: Bundle, root = ".", get: typeof fetch = fetch): Promise<string> {
  const part = bundle.parts.find((one) => one.name === READER_PART);
  if (!part) throw new Error(`${MANIFEST} names no reader file from a Tutors release`);
  await fetchParts({ ...bundle, parts: [part] }, root, get);
  const unpacked = join(root, ".cache", "reader-unpacked");
  rmSync(unpacked, { recursive: true, force: true });
  mkdirSync(unpacked, { recursive: true });
  // Relative paths, run in the folder: a Windows path's drive letter reads as a remote host to some tars.
  execFileSync("tar", ["-xzf", relative(unpacked, join(root, part.file))], { cwd: unpacked, stdio: "inherit" });
  const inside = readdirSync(unpacked, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const built = existsSync(join(unpacked, "200.html")) ? unpacked : inside.length === 1 ? join(unpacked, inside[0].name) : unpacked;
  if (!existsSync(join(built, "200.html"))) throw new Error(`${part.url} holds no reader: there is no 200.html in it`);
  rmSync(join(root, READER_FOLDER), { recursive: true, force: true });
  cpSync(built, join(root, READER_FOLDER), { recursive: true });
  writeFileSync(join(root, READER_FOLDER, READER_STAMP), `${bundle.reader.commit}\n`);
  rmSync(unpacked, { recursive: true, force: true });
  return part.url;
}

if (process.argv[1]?.endsWith("bundle.ts")) {
  const [command, flag, more] = process.argv.slice(2);
  try {
    if (command === "pins" && flag === "--check") {
      const stale = stalePins();
      if (stale.length > 0) throw new Error(`These pins differ from ${MANIFEST}; run pnpm bundle pins:\n${stale.map((p) => `  ${p}`).join("\n")}`);
      console.log(`The pins match ${MANIFEST}.`);
    } else if (command === "pins") {
      for (const [path, text] of Object.entries(pinsFor(readBundle()))) writeFileSync(path, text);
      console.log(`Wrote the pins from ${MANIFEST}.`);
    } else if (command === "cli") {
      await bundleStudioCli();
      console.log(`Bundled Studio's command line into ${STUDIO_CLI}.`);
    } else if (command === "tools") {
      const bundle = readBundle();
      const mono = checkoutAtPin(flag, bundle, "tools");
      const target = more ?? hostTarget();
      await bundleStudioCli();
      mkdirSync("src-tauri/binaries", { recursive: true });
      const deno = execFileSync("deno", ["--version"], { encoding: "utf8" }).split("\n")[0];
      if (!deno.includes(` ${bundle.deno} `)) throw new Error(`${MANIFEST} pins Deno ${bundle.deno}, but this computer has ${deno}`);
      const compile = (one: string) =>
        execFileSync(
          "deno",
          ["compile", "-A", "--no-check", "--node-modules-dir=none", "--config", join(mono, "deno.json"), "--target", one, "--output", toolsFile(one), "tools/main.ts"],
          { stdio: "inherit" },
        );
      if (target === UNIVERSAL_MAC) {
        // A universal Mac app carries one tools program for Apple silicon and Intel (P2): both, joined by lipo.
        // Tauri builds each architecture on its own first, and each looks for its own program, so all three stay.
        for (const one of MAC_TARGETS) compile(one);
        execFileSync("lipo", ["-create", "-output", toolsFile(target), ...MAC_TARGETS.map(toolsFile)], { stdio: "inherit" });
      } else compile(target);
      console.log(`Compiled ${toolsFile(target)}.`);
    } else if (command === "reader") {
      const bundle = readBundle();
      if (bundle.parts.some((part) => part.name === READER_PART)) {
        // A Tutors release carries its reader (ADR 0069): installed from it, checked by its SHA-256, nothing built.
        const from = await installReader(bundle);
        console.log(`Installed the reader of Tutors ${bundle.tutors} from ${from} into ${READER_FOLDER}.`);
        process.exit(0);
      }
      // With no checkout named, the pinned commit is fetched into .cache/ (ADR 0066), so `pnpm tauri dev` can carry the reader too.
      const mono = flag ?? pinnedCheckout(bundle);
      checkoutAtPin(mono, bundle, "reader");
      const run = (args: string[], env: Record<string, string> = {}) =>
        execFileSync("pnpm", args, { cwd: mono, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
      if (!existsSync(join(mono, ".env"))) cpSync(join(mono, ".env.example"), join(mono, ".env"));
      run(["install", "--frozen-lockfile"]);
      run(["--filter", "tutors-reader...", "build"], { SVELTEKIT_ADAPTER: "static", PUBLIC_ANON_MODE: "TRUE" });
      const built = join(mono, "apps", "reader", "build");
      if (!existsSync(join(built, "200.html"))) throw new Error(`The reader built without its fallback page: ${built}/200.html`);
      rmSync(READER_FOLDER, { recursive: true, force: true });
      cpSync(built, READER_FOLDER, { recursive: true });
      writeFileSync(join(READER_FOLDER, READER_STAMP), `${bundle.reader.commit}\n`);
      console.log(`Built the reader from ${bundle.reader.repository}@${bundle.reader.commit.slice(0, 7)} into ${READER_FOLDER}.`);
    } else if (command === "bump") {
      // pnpm bundle bump --release <tutors-release.json URL or file>: from a release's own manifest (ADR 0069).
      // pnpm bundle bump <tag> <commit> <generator version> <tutors-lite version>: a release without one (ADR 0055).
      const [tutors, commit, generator, website] = process.argv.slice(3);
      const fromManifest = async (where: string) => parseReleaseManifest(/^https:\/\//.test(where) ? await (await fetch(where)).text() : readFileSync(where, "utf8"));
      const bumped = flag === "--release" ? bundleFromRelease(readBundle(), await fromManifest(more)) : bumpBundle(readBundle(), { tutors, commit, generator, website });
      if (bumped === null) console.log(`${MANIFEST} already has Tutors ${readBundle().tutors} or newer.`);
      else {
        writeFileSync(MANIFEST, `${JSON.stringify(bumped, null, 2)}\n`);
        for (const [path, text] of Object.entries(pinsFor(bumped))) writeFileSync(path, text);
        console.log(`Moved ${MANIFEST} and its pins to Tutors ${bumped.tutors}.`);
      }
    } else if (command === "fetch") {
      const written = await fetchParts(readBundle());
      console.log(written.length === 0 ? "No parts to download." : `Downloaded and checked:\n${written.map((f) => `  ${f}`).join("\n")}`);
    } else {
      console.error(
        "Usage: pnpm bundle pins [--check] | fetch | bump --release <tutors-release.json> | bump <tag> <commit> <generator> <tutors-lite> | cli | tools <tutors-mono-repo checkout> [target] | reader [<tutors-mono-repo checkout>]",
      );
      process.exit(2);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
