import type { AuthoringPort } from "../../../application/ports/authoring.ts";

/**
 * The headless driver: `check` prints every finding, `fix` applies each finding's safe fix one plan at a
 * time and checks again. Returns the exit code: 0 clean, 1 errors remain, 2 unknown command.
 */
export async function runHeadless(authoring: AuthoringPort, command: string, print: (line: string) => void): Promise<number> {
  if (command !== "check" && command !== "fix") {
    print(`Unknown command "${command}". Use check or fix.`);
    return 2;
  }
  let view = await authoring.refresh();
  if (command === "fix") {
    for (const finding of view.findings) {
      const plan = authoring.planFix(finding);
      if (plan === null) continue;
      const result = await authoring.apply(plan);
      print(result.ok ? `Fixed: ${plan.summary}` : `Couldn't ${plan.summary.toLowerCase()}: ${result.blockedBy} (${result.reason})`);
    }
    view = await authoring.refresh();
  }
  for (const finding of view.findings) print(`${finding.severity.padEnd(5)} ${finding.path === "" ? "(course folder)" : finding.path}: ${finding.message}`);
  const errors = view.findings.filter((f) => f.severity === "error").length;
  print(errors === 0 ? "Everything checks out." : `${errors} problem${errors === 1 ? "" : "s"} to fix before publishing.`);
  return errors === 0 ? 0 : 1;
}
