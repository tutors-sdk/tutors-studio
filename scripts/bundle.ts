// The Tutors inside Studio, from one file (ADR 0043, STU-0171 to STU-0173). tutors-bundle.json names the
// Tutors release, the generator, tutors-lite and Deno; the pins in src/domain/bundle.ts and
// src-tauri/src/bundle.rs are written from it, and every part the build downloads is checked against
// the SHA-256 it gives.
//
//   pnpm bundle pins            write the pins
//   pnpm bundle pins --check    fail if a pin differs from tutors-bundle.json
//   pnpm bundle fetch           download each part and check its SHA-256
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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
  if (!Array.isArray(bundle.parts)) wrong(`"parts" must be a list`);
  for (const part of bundle.parts) {
    if (!part.name || !/^https:\/\//.test(part.url ?? "")) wrong(`part "${part.name ?? "?"}" needs a name and an https url`);
    if (!/^[0-9a-f]{64}$/.test(part.sha256 ?? "")) wrong(`part "${part.name}" needs the SHA-256 of its file, 64 hex digits`);
    if (!part.file || part.file.includes("..")) wrong(`part "${part.name}" needs a file inside the repository`);
  }
  return bundle;
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
/// The only image Studio runs: Deno, when this computer has none of its own.
pub const IMAGE: &str = ${JSON.stringify(`docker.io/denoland/deno:${bundle.deno}`)};
`,
  };
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

if (process.argv[1]?.endsWith("bundle.ts")) {
  const [command, flag] = process.argv.slice(2);
  try {
    if (command === "pins" && flag === "--check") {
      const stale = stalePins();
      if (stale.length > 0) throw new Error(`These pins differ from ${MANIFEST}; run pnpm bundle pins:\n${stale.map((p) => `  ${p}`).join("\n")}`);
      console.log(`The pins match ${MANIFEST}.`);
    } else if (command === "pins") {
      for (const [path, text] of Object.entries(pinsFor(readBundle()))) writeFileSync(path, text);
      console.log(`Wrote the pins from ${MANIFEST}.`);
    } else if (command === "fetch") {
      const written = await fetchParts(readBundle());
      console.log(written.length === 0 ? "No parts to download." : `Downloaded and checked:\n${written.map((f) => `  ${f}`).join("\n")}`);
    } else {
      console.error("Usage: pnpm bundle pins [--check] | fetch");
      process.exit(2);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
