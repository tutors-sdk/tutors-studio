import { isNetlifySiteName, readerLinkFor, websiteFolderFor } from "../../domain/publish.ts";
import type { CourseBuildPort } from "../ports/course-build.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { BuiltFile, HostingPort } from "../ports/hosting.ts";
import type { LocalReaderPort } from "../ports/local-reader.ts";
import type { Failure, PreviewResult, PublishingPort, PublishResult, WebsiteResult } from "../ports/publishing.ts";
import type { SaveCopyPort } from "../ports/save-copy.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";

export interface PublishingDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  build: CourseBuildPort;
  reader: LocalReaderPort;
  hosting: HostingPort;
  /** Where a website is saved; absent where Studio can't write outside the course (the browser preview). */
  saveCopy?: SaveCopyPort;
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
  /** The sentence that stops a course with errors going anywhere students read it. */
  const blockedBy = async (progress: ((step: string) => void) | undefined): Promise<Failure | null> => {
    say(progress, "Checking the course");
    const errors = (await deps.rules.validate(deps.fs)).filter((finding) => finding.severity === "error").length;
    return errors === 0
      ? null
      : { ok: false, reason: `Fix the ${errors} problem${errors === 1 ? "" : "s"} the course map shows before publishing, so students see the whole course.`, detail: "" };
  };
  return {
    async previewHere(progress): Promise<PreviewResult> {
      say(progress, "Building the course");
      const built = await deps.build.build();
      if (!built.ok) return built;
      say(progress, "Opening it on this computer");
      const started = await deps.reader.start(built.folder);
      deps.telemetry.event(started.ok ? "preview.started" : "preview.failed", {});
      return started;
    },

    stopPreview: () => deps.reader.stop(),

    async host() {
      return { name: deps.hosting.name, signedIn: await deps.hosting.signedIn() };
    },

    signIn: (token: string) => deps.hosting.signIn(token),

    async saveWebsite(parent, courseName, progress): Promise<WebsiteResult> {
      if (deps.saveCopy === undefined) return { ok: false, reason: "Saving the course as a website needs the Studio app on your computer.", detail: "" };
      const blocked = await blockedBy(progress);
      if (blocked) return blocked;
      say(progress, "Building the course as a website");
      const built = await deps.build.buildWebsite();
      if (!built.ok) return built;
      say(progress, "Saving the website");
      const saved = await deps.saveCopy.saveCopy(built.folder, parent, websiteFolderFor(courseName));
      deps.telemetry.event(saved.ok ? "website.saved" : "website.failed", {});
      if (!saved.ok) return saved;
      return { ok: true, folder: saved.folder, page: `${saved.folder}/index.html` };
    },

    async publish(site, progress): Promise<PublishResult> {
      if (!isNetlifySiteName(site))
        return { ok: false, reason: `"${site}" can't be a ${deps.hosting.name} site name. Use lower-case letters, digits and single hyphens, like web-dev-2026.`, detail: "" };
      const blocked = await blockedBy(progress);
      if (blocked) return blocked;
      say(progress, "Building the course");
      const built = await deps.build.build();
      if (!built.ok) return built;
      say(progress, "Putting the course online");
      const files = await filesUnder(deps.fs, built.folder);
      const deployed = await deps.hosting.deploy(site, files);
      deps.telemetry.event(deployed.ok ? "publish.done" : "publish.failed", { files: files.length });
      if (!deployed.ok) return deployed satisfies Failure;
      return { ok: true, siteUrl: deployed.siteUrl, readerUrl: readerLinkFor(site), uploaded: deployed.uploaded };
    },
  };
}
