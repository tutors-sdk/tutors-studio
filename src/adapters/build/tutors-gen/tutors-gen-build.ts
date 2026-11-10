import type { BuildOutcome, CourseBuildPort, GateOutcome } from "../../../application/ports/course-build.ts";
import type { ProcessPort, ProcessResult, Tool } from "../../../application/ports/process.ts";
import type { Finding } from "../../../domain/finding.ts";
import { BUILD_FOLDER, TUTORS_GENERATOR, TUTORS_VALIDATOR, WEBSITE_FOLDER, WEBSITE_GENERATOR } from "../../../domain/publish.ts";

/** The Deno image the generator runs in when Deno itself isn't installed; the same Deno the course's netlify.toml gets. */
export const DENO_IMAGE = "docker.io/denoland/deno:2.9.6";

const generate = (generator: string) => ["run", "-A", "--node-modules-dir=none", generator];

const lastLines = (text: string, count = 12) => text.trim().split("\n").slice(-count).join("\n");

/**
 * Builds the course with the Tutors generator itself (`tutors`, from JSR), so what Studio previews and
 * publishes is what Netlify would build. Uses Deno when it is installed, else Deno in a container
 * (Docker or Podman), so a lecturer needs only one of the two. A website of its own is built the same
 * way with tutors-lite.
 */
const isFinding = (value: unknown): value is Finding => {
  const f = value as Record<string, unknown> | null;
  return (
    typeof f === "object" &&
    f !== null &&
    typeof f.rule === "string" &&
    typeof f.path === "string" &&
    typeof f.message === "string" &&
    ["error", "warn", "info"].includes(f.severity as string)
  );
};

/** The findings in `tutors validate --format json`'s report (a JSON array in the Finding shape), or null for anything else. */
export function findingsIn(stdout: string): Finding[] | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    return Array.isArray(parsed) && parsed.every(isFinding) ? parsed : null;
  } catch {
    return null;
  }
}

const noEngine = {
  ok: false as const,
  reason:
    "Studio builds your course with Deno, or with Docker or Podman when Deno isn't installed, and none of them is on this computer. Install Docker Desktop (or Podman Desktop), open it once, then try again.",
  detail: "",
};

/**
 * Builds the course with the Tutors generator itself (`tutors`, from JSR), so what Studio previews and
 * publishes is what Netlify would build. Uses Deno when it is installed, else Deno in a container
 * (Docker or Podman), so a lecturer needs only one of the two. A website of its own is built the same
 * way with tutors-lite, and the pinned command line (`validator`, ADR 0034) checks the course the same way.
 */
export function tutorsGenBuild(process: ProcessPort, courseRoot: string, validator: string | null = TUTORS_VALIDATOR): CourseBuildPort {
  const installed = async (tool: Tool) => (await process.run(tool, ["--version"])).code === 0;
  /** Runs Deno with these arguments in the course folder, or in a container there; null when neither is on the computer. */
  const deno = async (args: string[]): Promise<ProcessResult | null> => {
    if (await installed("deno")) return process.run("deno", args, { cwd: courseRoot });
    const engine = (await installed("docker")) ? "docker" : (await installed("podman")) ? "podman" : null;
    if (engine === null) return null;
    return process.run(engine, ["run", "--rm", "-v", `${courseRoot}:/course`, "-w", "/course", DENO_IMAGE, ...args]);
  };
  const run = async (generator: string, folder: string): Promise<BuildOutcome> => {
    const result = await deno(generate(generator));
    if (result === null) return noEngine;
    if (result.code !== 0)
      return {
        ok: false,
        reason: "The Tutors generator stopped before it finished building the course. The last lines it printed are below.",
        detail: lastLines(`${result.stdout}\n${result.stderr}`),
      };
    return { ok: true, folder, generator };
  };
  return {
    build: () => run(TUTORS_GENERATOR, BUILD_FOLDER),
    buildWebsite: () => run(WEBSITE_GENERATOR, WEBSITE_FOLDER),
    validates: validator !== null,
    async validate(): Promise<GateOutcome> {
      if (validator === null) return null;
      const result = await deno([...generate(validator), "validate", ".", "--format", "json"]);
      if (result === null) return noEngine;
      // Exit 0 is clean and 1 is errors; either way the report is on stdout. 3 is a folder it couldn't read.
      const findings = result.code === 0 || result.code === 1 || result.code === 2 ? findingsIn(result.stdout) : null;
      if (findings === null)
        return {
          ok: false,
          reason: "The Tutors command line couldn't check the course, so Studio stopped before going further. The last lines it printed are below.",
          detail: lastLines(`${result.stdout}\n${result.stderr}`),
        };
      return { ok: true, findings };
    },
  };
}
