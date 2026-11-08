import type { BuildOutcome, CourseBuildPort } from "../../../application/ports/course-build.ts";
import type { ProcessPort, Tool } from "../../../application/ports/process.ts";
import { BUILD_FOLDER, TUTORS_GENERATOR } from "../../../domain/publish.ts";

/** The Deno image the generator runs in when Deno itself isn't installed; the same Deno the course's netlify.toml gets. */
export const DENO_IMAGE = "docker.io/denoland/deno:2.9.6";

const GENERATE = ["run", "-A", "--node-modules-dir=none", TUTORS_GENERATOR];

const lastLines = (text: string, count = 12) => text.trim().split("\n").slice(-count).join("\n");

/**
 * Builds the course with the Tutors generator itself (`tutors`, from JSR), so what Studio previews and
 * publishes is what Netlify would build. Uses Deno when it is installed, else Deno in a container
 * (Docker or Podman), so a lecturer needs only one of the two.
 */
export function tutorsGenBuild(process: ProcessPort, courseRoot: string): CourseBuildPort {
  const installed = async (tool: Tool) => (await process.run(tool, ["--version"])).code === 0;
  return {
    async build(): Promise<BuildOutcome> {
      let result;
      if (await installed("deno")) result = await process.run("deno", GENERATE, { cwd: courseRoot });
      else {
        const engine = (await installed("docker")) ? "docker" : (await installed("podman")) ? "podman" : null;
        if (engine === null)
          return {
            ok: false,
            reason:
              "Studio builds your course with Deno, or with Docker or Podman when Deno isn't installed, and none of them is on this computer. Install Docker Desktop (or Podman Desktop), open it once, then try again.",
            detail: "",
          };
        result = await process.run(engine, ["run", "--rm", "-v", `${courseRoot}:/course`, "-w", "/course", DENO_IMAGE, ...GENERATE]);
      }
      if (result.code !== 0)
        return {
          ok: false,
          reason: "The Tutors generator stopped before it finished building the course. The last lines it printed are below.",
          detail: lastLines(`${result.stdout}\n${result.stderr}`),
        };
      return { ok: true, folder: BUILD_FOLDER, generator: TUTORS_GENERATOR };
    },
  };
}
