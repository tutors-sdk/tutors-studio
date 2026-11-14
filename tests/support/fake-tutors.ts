import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BuildOutcome, CourseBuildPort } from "../../src/application/ports/course-build.ts";

/**
 * A copy of Tutors on disk whose `pnpm dev` starts a stand-in reader: a small server that answers /healthz as
 * the Tutors reader does and prints its address the way Vite does. So the real Node adapter is driven end to
 * end (pnpm, the child process, the address it prints, stopping it) without building Tutors itself.
 */
export function fakeTutorsFolder(options: { installed?: boolean; name?: string } = {}): string {
  const folder = mkdtempSync(join(tmpdir(), "tutors-copy-"));
  writeFileSync(join(folder, "package.json"), JSON.stringify({ name: options.name ?? "tutors-mono-repo", private: true, scripts: { dev: "node reader.mjs" } }));
  mkdirSync(join(folder, "apps", "reader"), { recursive: true });
  if (options.installed ?? true) mkdirSync(join(folder, "node_modules"));
  writeFileSync(join(folder, "reader.mjs"), STAND_IN_READER);
  return folder;
}

/** A Tutors reader stand-in, as a script: answers /healthz with its name and the anon mode it was started in. */
export const STAND_IN_READER = `
import { createServer } from "node:http";
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ app: "tutors-reader", anon: process.env.PUBLIC_ANON_MODE ?? null }));
});
server.listen(0, "127.0.0.1", () => {
  console.log("  \\u001b[32m➜\\u001b[39m  \\u001b[1mLocal\\u001b[22m:   http://localhost:" + server.address().port + "/");
});
`;

/** A reader already running at an address, as when the lecturer started Tutors themselves. */
export async function runningReader(): Promise<{ origin: string; close: () => Promise<void> }> {
  const { createServer } = await import("node:http");
  const server = createServer((_request, response) => response.end(JSON.stringify({ app: "tutors-reader" })));
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const port = (server.address() as { port: number }).port;
  return { origin: `http://127.0.0.1:${port}`, close: () => new Promise((done) => server.close(() => done())) };
}

/** The Tutors generator's stand-in: writes json/tutors.json with the course's title, or fails when the course says so. */
export function fakeBuild(courseRoot: string): CourseBuildPort & { builds: number } {
  const build = {
    builds: 0,
    async build(): Promise<BuildOutcome> {
      const course = readFileSync(join(courseRoot, "course.md"), "utf8");
      if (course.includes("BROKEN"))
        return { ok: false, reason: "The Tutors generator stopped before it finished building the course. The last lines it printed are below.", detail: "error: BROKEN" };
      build.builds++;
      mkdirSync(join(courseRoot, "json"), { recursive: true });
      writeFileSync(join(courseRoot, "json", "tutors.json"), JSON.stringify({ title: course.split("\n")[0].replace(/^#\s*/, ""), build: build.builds }));
      return { ok: true, folder: "json", generator: "fake" };
    },
    buildWebsite: async (): Promise<BuildOutcome> => ({ ok: false, reason: "not here", detail: "" }),
    validate: async () => null,
    validates: false,
  };
  return build;
}

export const removeFolder = (folder: string) => rmSync(folder, { recursive: true, force: true });
