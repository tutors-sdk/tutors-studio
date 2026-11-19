/** The command a lecturer types, and what it runs: Studio's command line without a window (ADR 0053). */
export const COMMAND = "tutors-studio";

type Added = { kind: "added"; command: string; on_path: boolean } | { kind: "not-here"; reason: string };

/** What Settings says after "Add the command line to this computer" (STU-0208). */
export function commandLineWords(added: Added): string {
  if (added.kind === "not-here") return added.reason;
  if (added.on_path) return `Added. In a new terminal, type ${COMMAND} <course folder> check, or ${COMMAND} <course folder> mcp for an assistant. The command is ${added.command}.`;
  return `Added as ${added.command}, but that folder isn't on this computer's path yet, so a terminal won't find ${COMMAND} by name. Add the folder to your PATH, or type the command's full name.`;
}
