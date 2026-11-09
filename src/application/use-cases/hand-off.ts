import { BUILD_FOLDER } from "../../domain/publish.ts";
import type { Plan } from "../../domain/plan.ts";
import type { CourseRulesPort } from "../ports/course-rules.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import type { HandOffPort, HandOffStatus } from "../ports/hand-off.ts";
import type { GitOutcome, PublishPort } from "../ports/publish.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";
import { IGNORE, ignoreBuildOp, ignoresBuild, readIgnore as readIgnoreOf, setupOps } from "./standard-setup.ts";

export interface HandOffDeps {
  fs: FileSystemPort;
  rules: CourseRulesPort;
  git: PublishPort;
  telemetry: TelemetryPort;
  newId: () => string;
}

/** Step 9's hand-off: check, keep the generated build out of git, then commit and push with the computer's git. */
export function createHandOff(deps: HandOffDeps): HandOffPort {
  const { fs, rules, git } = deps;
  const readIgnore = () => readIgnoreOf(fs);
  const status = async (): Promise<HandOffStatus> => {
    const [findings, gitStatus, ignore] = await Promise.all([rules.validate(fs), git.status(), readIgnore()]);
    return { errors: findings.filter((finding) => finding.severity === "error").length, git: gitStatus, ignoresBuild: ignore !== null && ignoresBuild(ignore) };
  };
  return {
    status,
    async planIgnoreBuild(): Promise<Plan> {
      return { id: deps.newId(), summary: `Leave the generated ${BUILD_FOLDER}/ folder out of git in ${IGNORE}`, ops: [await ignoreBuildOp(fs)] };
    },
    async planSetup(): Promise<Plan | null> {
      const ops = await setupOps(fs, rules);
      return ops.length === 0 ? null : { id: deps.newId(), summary: "Add the setup this course needs to go online", ops };
    },
    async commitAndPush(message: string): Promise<GitOutcome> {
      const now = await status();
      if (now.errors > 0)
        return {
          ok: false,
          reason: `Fix the ${now.errors} problem${now.errors === 1 ? "" : "s"} the course map shows before publishing, so students see the whole course.`,
          detail: "",
        };
      if (!now.ignoresBuild)
        return { ok: false, reason: `The course's ${IGNORE} doesn't leave out the generated ${BUILD_FOLDER}/ folder, so it would be committed. Add it first.`, detail: "" };
      const text = message.trim() === "" ? "Update the course" : message.trim();
      const outcome = await git.commitAndPush(text);
      deps.telemetry.event(outcome.ok ? "handoff.pushed" : "handoff.failed", { files: now.git.changedFiles.length });
      return outcome;
    },
  };
}
