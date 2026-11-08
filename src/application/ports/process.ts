/**
 * Driven port: runs one of the tools Studio publishes with (docker, podman, deno, git) and waits for it. The
 * Tauri adapter runs only those programs, from the Rust side; the Node adapter serves the headless CLI.
 */
export interface ProcessResult {
  /** The exit code; null when the program could not be started at all (not installed). */
  code: number | null;
  stdout: string;
  stderr: string;
}

export type Tool = "docker" | "podman" | "deno" | "git";

export interface ProcessPort {
  run(tool: Tool, args: string[], options?: { cwd?: string }): Promise<ProcessResult>;
}
