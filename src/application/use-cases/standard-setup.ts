import { isMissingSetup } from "../../domain/finding.ts";
import { BUILD_FOLDER } from "../../domain/publish.ts";
import type { FileOp } from "../../domain/plan.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";

export const IGNORE = ".gitignore";

/** A .gitignore line that leaves out the build folder at the course root: json, json/, /json or /json/. */
export const ignoresBuild = (text: string) => text.split(/\r?\n/).some((line) => new RegExp(`^/?${BUILD_FOLDER}/?\\s*$`).test(line.trim()));

export const readIgnore = async (fs: FileSystemPort) => ((await fs.exists(IGNORE)) ? new TextDecoder().decode(await fs.read(IGNORE)) : null);

/** The write that adds the build folder to the course's .gitignore, keeping what is there. */
export async function ignoreBuildOp(fs: FileSystemPort): Promise<FileOp> {
  const current = (await readIgnore(fs)) ?? "";
  const content = `${current}${current === "" || current.endsWith("\n") ? "" : "\n"}# The Tutors generator's output: Netlify builds it, so it never goes in git.\n${BUILD_FOLDER}/\n`;
  return { op: "write", path: IGNORE, content: new TextEncoder().encode(content) };
}

/**
 * The standard setup a course lacks (ADR 0027): each file course-rules can write exactly (netlify.toml),
 * and the .gitignore line that leaves the build out. Nothing is written.
 */
export async function setupOps(fs: FileSystemPort, rules: CourseRulesPort): Promise<FileOp[]> {
  const ops: FileOp[] = (await rules.validate(fs))
    .filter(isMissingSetup)
    .flatMap((finding) => (finding.fix?.op === "write" ? [{ op: "write" as const, path: finding.fix.path, content: new TextEncoder().encode(finding.fix.content) }] : []));
  const ignore = await readIgnore(fs);
  if (ignore === null || !ignoresBuild(ignore)) ops.push(await ignoreBuildOp(fs));
  return ops;
}
