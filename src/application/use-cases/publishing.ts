import { isNetlifySiteName, readerLinkFor } from "../../domain/publish.ts";
import type { CourseBuildPort } from "../ports/course-build.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { BuiltFile, HostingPort } from "../ports/hosting.ts";
import type { LocalReaderPort } from "../ports/local-reader.ts";
import type { Failure, PreviewResult, PublishingPort, PublishResult } from "../ports/publishing.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";

export interface PublishingDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  build: CourseBuildPort;
  reader: LocalReaderPort;
  hosting: HostingPort;
  telemetry: TelemetryPort;
}

const joined = (folder: string, name: string) => (folder === "" ? name : `${folder}/${name}`);

/** Every file under a folder, depth first, with paths relative to that folder. */
async function filesUnder(fs: FileSystemPort, folder: string, prefix = ""): Promise<BuiltFile[]> {
  const files: BuiltFile[] = [];
  for (const entry of (await fs.list(joined(folder, prefix))).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = joined(prefix, entry.name);
    if (entry.kind === "dir") files.push(...(await filesUnder(fs, folder, path)));
    else files.push({ path, bytes: await fs.read(joined(folder, path)) });
  }
  return files;
}

/**
 * Publishing over whichever adapters the composition root bound: the Tutors generator builds the course
 * into json/ (the one write outside a plan, ADR 0019: generated output, never the lecturer's files), a
 * local reader shows it, a host publishes it.
 */
export function createPublishing(deps: PublishingDeps): PublishingPort {
  const say = (progress: ((step: string) => void) | undefined, step: string) => progress?.(step);
  return {
    async previewHere(progress): Promise<PreviewResult> {
      say(progress, "Building the course with the Tutors generator");
      const built = await deps.build.build();
      if (!built.ok) return built;
      say(progress, "Starting the Tutors reader on this computer");
      const started = await deps.reader.start(built.folder);
      deps.telemetry.event(started.ok ? "preview.started" : "preview.failed", {});
      return started;
    },

    stopPreview: () => deps.reader.stop(),

    async host() {
      return { name: deps.hosting.name, signedIn: await deps.hosting.signedIn() };
    },

    signIn: (token: string) => deps.hosting.signIn(token),

    async publish(site, progress): Promise<PublishResult> {
      if (!isNetlifySiteName(site))
        return { ok: false, reason: `"${site}" can't be a ${deps.hosting.name} site name. Use lower-case letters, digits and single hyphens, like web-dev-2026.`, detail: "" };
      say(progress, "Checking the course");
      const errors = (await deps.rules.validate(deps.fs)).filter((finding) => finding.severity === "error").length;
      if (errors > 0)
        return { ok: false, reason: `Fix the ${errors} problem${errors === 1 ? "" : "s"} the course map shows before publishing, so students see the whole course.`, detail: "" };
      say(progress, "Building the course with the Tutors generator");
      const built = await deps.build.build();
      if (!built.ok) return built;
      say(progress, `Sending the course to ${deps.hosting.name}`);
      const files = await filesUnder(deps.fs, built.folder);
      const deployed = await deps.hosting.deploy(site, files);
      deps.telemetry.event(deployed.ok ? "publish.done" : "publish.failed", { files: files.length });
      if (!deployed.ok) return deployed satisfies Failure;
      return { ok: true, siteUrl: deployed.siteUrl, readerUrl: readerLinkFor(site), uploaded: deployed.uploaded };
    },
  };
}
