/**
 * Driven port: runs one of the tools Studio publishes with (its own Tutors tools, deno, git) and waits for it. The
 * Tauri adapter runs only those programs, from the Rust side; the Node adapter serves the headless CLI.
 */
export interface ProcessResult {
  /** The exit code; null when the program could not be started at all (not installed). */
  code: number | null;
  stdout: string;
  stderr: string;
}

/** "tutors-tools" is the Tutors tools program bundled beside Studio (ADR 0044). */
export type Tool = "tutors-tools" | "deno" | "git";

export interface ProcessPort {
  run(tool: Tool, args: string[], options?: { cwd?: string }): Promise<ProcessResult>;
}
