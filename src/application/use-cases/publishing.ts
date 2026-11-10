import { isMissingSetup } from "../../domain/finding.ts";
import { isNetlifySiteName, readerLinkFor, websiteFolderFor } from "../../domain/publish.ts";
import type { CourseBuildPort } from "../ports/course-build.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { BuiltFile, HostingPort } from "../ports/hosting.ts";
import type { Failure, PublishingPort, PublishResult, SaveResult, WebsiteResult } from "../ports/publishing.ts";
import type { SaveCopyPort } from "../ports/save-copy.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";
import { applyPlan } from "./apply-plan.ts";
import { setupOps } from "./standard-setup.ts";

export interface PublishingDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  build: CourseBuildPort;
  hosting: HostingPort;
  /** Where a website is saved; absent where Studio can't write outside the course (the browser preview). */
  saveCopy?: SaveCopyPort;
  telemetry: TelemetryPort;
  newId?: () => string;
  /** The site this course is published as, kept in Studio's settings by the course's folder; absent in the browser preview. */
  sites?: { get(): Promise<string | null>; set(site: string): Promise<void> };
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
 * into json/ (the one write outside a plan, ADR 0019: generated output, never the lecturer's files) and a
 * host publishes it.
 */
export function createPublishing(deps: PublishingDeps): PublishingPort {
  const say = (progress: ((step: string) => void) | undefined, step: string) => progress?.(step);
  /** The sentence that stops a course with errors going anywhere students read it. */
  const blockedBy = async (progress: ((step: string) => void) | undefined): Promise<Failure | null> => {
    say(progress, "Checking the course against the Tutors rules");
    const errors = (await deps.rules.validate(deps.fs)).filter((finding) => finding.severity === "error").length;
    return errors === 0
      ? null
      : { ok: false, reason: `Fix the ${errors} problem${errors === 1 ? "" : "s"} the course map shows before publishing, so students see the whole course.`, detail: "" };
  };
  /** Adds the standard setup the course lacks, as the plan pressing Save or Publish accepts (ADR 0030). */
  const addSetup = async (progress: ((step: string) => void) | undefined): Promise<{ ok: true; added: string[] } | Failure> => {
    const ops = await setupOps(deps.fs, deps.rules);
    const added = ops.flatMap((op) => (op.op === "write" ? [op.path] : []));
    if (ops.length === 0) return { ok: true, added };
    say(progress, `Adding the standard setup: ${added.join(", ")}`);
    const applied = await applyPlan(deps.fs, { id: deps.newId?.() ?? "standard-setup", summary: "Add the setup this course needs to go online", ops });
    return applied.ok ? { ok: true, added } : { ok: false, reason: `Nothing was changed: ${applied.blockedBy} couldn't be written.`, detail: applied.reason };
  };
  return {
    async site() {
      return (await deps.sites?.get()) ?? null;
    },

    async save(progress): Promise<SaveResult> {
      // Studio checks names and keys at every step, so this confirms what the course map already shows.
      say(progress, "Checking the course against the Tutors rules");
      const findings = await deps.rules.validate(deps.fs);
      const errors = findings.filter((finding) => finding.severity === "error").length;
      if (errors > 0)
        return { ok: false, reason: `Fix the ${errors} problem${errors === 1 ? "" : "s"} the course map shows before saving, so the course is complete.`, detail: "" };
      const setup = await addSetup(progress);
      if (!setup.ok) return setup;
      const added = setup.added;
      deps.telemetry.event("course.saved", { added: added.length });
      return { ok: true, added, warnings: findings.filter((finding) => finding.severity === "warn" && !isMissingSetup(finding)).length };
    },

    async host() {
      return { name: deps.hosting.name, signedIn: await deps.hosting.signedIn() };
    },

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
      const setup = await addSetup(progress);
      if (!setup.ok) return setup;
      say(progress, "Building the course");
      const built = await deps.build.build();
      if (!built.ok) return built;
      say(progress, "Putting the course online");
      const files = await filesUnder(deps.fs, built.folder);
      const deployed = await deps.hosting.deploy(site, files);
      deps.telemetry.event(deployed.ok ? "publish.done" : "publish.failed", { files: files.length });
      if (!deployed.ok) return deployed satisfies Failure;
      await deps.sites?.set(site);
      return { ok: true, siteUrl: deployed.siteUrl, readerUrl: readerLinkFor(site), uploaded: deployed.uploaded };
    },
  };
}
