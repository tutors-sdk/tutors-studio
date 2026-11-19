/** What adding the command line did: where the command is and whether a new terminal finds it, or why it can't be added here. */
export type CommandLineAdded = { kind: "added"; command: string; on_path: boolean } | { kind: "not-here"; reason: string };

/**
 * Studio's command line on this computer (ADR 0053): a `tutors-studio` command that runs the bundled tools
 * program as `tutors-tools studio <course> <command>`, the same as `pnpm headless`. Added only when the
 * lecturer asks, from Settings.
 */
export interface CommandLinePort {
  add(): Promise<CommandLineAdded>;
}
