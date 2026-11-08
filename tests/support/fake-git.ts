import type { ProcessPort, ProcessResult, Tool } from "../../src/application/ports/process.ts";

export interface FakeGitOptions {
  /** False for a course folder that isn't a git repository. */
  repository?: boolean;
  branch?: string;
  remotes?: string[];
  /** `git status --porcelain` lines, e.g. " M topic-01/topic.md". */
  changed?: string[];
  /** Calls (by a part of their text) that exit 1 with an error on stderr. */
  failing?: string[];
}

/** The computer's git for the hand-off tests: answers status from its options and records every call. */
export class FakeGit implements ProcessPort {
  readonly calls: string[] = [];
  readonly options: Required<FakeGitOptions>;
  constructor(options: FakeGitOptions = {}) {
    this.options = { repository: true, branch: "main", remotes: ["origin"], changed: [" M topic-01/topic.md"], failing: [], ...options };
  }

  /** The calls that change the repository or a remote: add, commit and push. */
  get writes(): string[] {
    return this.calls.filter((call) => /^git (add|commit|push)\b/.test(call));
  }

  async run(tool: Tool, args: string[]): Promise<ProcessResult> {
    const call = `${tool} ${args.join(" ")}`;
    this.calls.push(call);
    const ok = (stdout = ""): ProcessResult => ({ code: 0, stdout, stderr: "" });
    if (tool !== "git") return { code: null, stdout: "", stderr: `spawn ${tool} ENOENT` };
    if (this.options.failing.some((part) => call.includes(part))) return { code: 1, stdout: "", stderr: `fatal: ${call} failed` };
    if (args[0] === "rev-parse" && args[1] === "--is-inside-work-tree")
      return this.options.repository ? ok("true\n") : { code: 128, stdout: "", stderr: "fatal: not a git repository (or any of the parent directories): .git" };
    if (args[0] === "rev-parse") return ok(`${this.options.branch}\n`);
    if (args[0] === "status") return ok(this.options.changed.map((line) => `${line}\n`).join(""));
    if (args[0] === "remote") return ok(this.options.remotes.map((name) => `${name}\n`).join(""));
    return ok();
  }
}
