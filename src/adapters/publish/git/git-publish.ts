import type { ProcessPort } from "../../../application/ports/process.ts";
import type { GitOutcome, GitStatus, PublishPort } from "../../../application/ports/publish.ts";

const lastLines = (text: string, count = 12) => text.trim().split("\n").slice(-count).join("\n");

/**
 * The computer's own git, in the course folder: status, then add, commit and push. Sign-in is git's own
 * (a credential helper, SSH keys); Studio never sees a password (ADR 0021).
 */
export function gitPublish(process: ProcessPort, courseRoot: string): PublishPort {
  const git = (args: string[]) => process.run("git", args, { cwd: courseRoot });
  async function status(): Promise<GitStatus> {
    const inside = await git(["rev-parse", "--is-inside-work-tree"]);
    if (inside.code !== 0 || inside.stdout.trim() !== "true") return { isRepository: false, branch: null, changedFiles: [], remote: null };
    const [branch, changes, remotes] = await Promise.all([git(["rev-parse", "--abbrev-ref", "HEAD"]), git(["status", "--porcelain"]), git(["remote"])]);
    const names = remotes.stdout
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    return {
      isRepository: true,
      branch: branch.code === 0 ? branch.stdout.trim() : null,
      changedFiles: changes.stdout
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => line.slice(3).replace(/^"|"$/g, "")),
      remote: names.includes("origin") ? "origin" : (names[0] ?? null),
    };
  }
  return {
    status,
    async commitAndPush(message: string): Promise<GitOutcome> {
      const now = await status();
      if (!now.isRepository)
        return {
          ok: false,
          reason:
            "This course folder isn't a git repository, so there is nothing to commit. Publish it to Netlify instead, or make the folder a repository (GitHub Desktop does it in one step) and push again.",
          detail: "",
        };
      if (now.changedFiles.length > 0) {
        const added = await git(["add", "-A"]);
        if (added.code !== 0) return { ok: false, reason: "git couldn't stage the changes.", detail: lastLines(added.stderr) };
        const committed = await git(["commit", "-m", message]);
        if (committed.code !== 0)
          return { ok: false, reason: "git couldn't commit the changes. The last lines it printed are below.", detail: lastLines(`${committed.stdout}\n${committed.stderr}`) };
      }
      if (now.remote === null)
        return { ok: false, reason: "The changes are committed, but this repository has no remote to push to. Add one on GitHub, then push again.", detail: "" };
      const pushed = await git(["push", "-u", now.remote, "HEAD"]);
      if (pushed.code !== 0)
        return {
          ok: false,
          reason: "git couldn't push. If it asks for a sign-in, push once from a terminal or GitHub Desktop so this computer remembers it, then try again.",
          detail: lastLines(pushed.stderr),
        };
      return { ok: true, summary: `${now.changedFiles.length === 0 ? "Nothing new to commit; pushed" : "Committed and pushed"} ${now.branch ?? "the branch"} to ${now.remote}.` };
    },
  };
}
