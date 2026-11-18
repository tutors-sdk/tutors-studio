import type { BuildOutcome, CourseBuildPort, GateOutcome } from "../../../application/ports/course-build.ts";
import type { ProcessPort, ProcessResult, Tool } from "../../../application/ports/process.ts";
import type { Finding } from "../../../domain/finding.ts";
import { BUILD_FOLDER, TUTORS_GENERATOR, TUTORS_VALIDATOR, WEBSITE_FOLDER, WEBSITE_GENERATOR } from "../../../domain/publish.ts";

const generate = (generator: string) => ["run", "-A", "--node-modules-dir=none", generator];

const lastLines = (text: string, count = 12) => text.trim().split("\n").slice(-count).join("\n");

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

/** STU-0175: a copy with neither its own Tutors tools nor Deno. */
export const NO_TOOLS =
  "This copy of Studio is missing its Tutors tools, so it can't build the course. Download Studio again from the release page and install it over this one; your courses and settings stay as they are.";

const noEngine = { ok: false as const, reason: NO_TOOLS, detail: "" };

/**
 * Builds the course with the Tutors generator itself, so what Studio previews and publishes is what Netlify
 * would build. Uses the Tutors tools program bundled beside Studio (STU-0174, ADR 0044), which holds the
 * pinned generator and tutors-lite; a copy built without it (development, the headless CLI) uses Deno and
 * `jsr:`. The pinned command line (`validator`, ADR 0034) checks the course with Deno until the tools carry it.
 */
export function tutorsGenBuild(process: ProcessPort, courseRoot: string, validator: string | null = TUTORS_VALIDATOR): CourseBuildPort {
  const installed = async (tool: Tool) => (await process.run(tool, ["--version"])).code === 0;
  /** Runs Deno with these arguments in the course folder; null when Deno is not on the computer. */
  const deno = async (args: string[]): Promise<ProcessResult | null> => ((await installed("deno")) ? process.run("deno", args, { cwd: courseRoot }) : null);
  /** Runs the bundled tools' `build` or `website` in the course folder, else the same generator with Deno. */
  const generate_ = async (command: "build" | "website", generator: string): Promise<ProcessResult | null> =>
    (await installed("tutors-tools")) ? process.run("tutors-tools", [command], { cwd: courseRoot }) : deno(generate(generator));
  const run = async (command: "build" | "website", generator: string, folder: string): Promise<BuildOutcome> => {
    const result = await generate_(command, generator);
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
    build: () => run("build", TUTORS_GENERATOR, BUILD_FOLDER),
    buildWebsite: () => run("website", WEBSITE_GENERATOR, WEBSITE_FOLDER),
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
