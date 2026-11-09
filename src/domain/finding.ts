/** A problem with the lecturer's course, as Studio shows it. Mirrors @tutors/course-rules' Finding; the rules adapter maps one to the other. */
export type Severity = "error" | "warn" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  /** Relative to the course root, "/"-separated; "" is the root. */
  path: string;
  /** Written for a lecturer, from course-rules' messages. Studio adds no copy of its own. */
  message: string;
  suggestedName?: string;
  /** The rules' safe fix, when there is one: what "Fix all safe" applies without asking about each finding. */
  fix?: { op: "move"; from: string; to: string } | { op: "write"; path: string; content: string };
}

export const errorsFirst = (findings: readonly Finding[]): Finding[] => {
  const rank: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path));
};

/**
 * A folder Tutors leaves out because its name declares no kind (V002) is the lecturer's to name: they
 * choose what it is from the kinds that fit where it sits ("Let students see this"). So Studio offers no
 * rename that guesses the kind for them, one at a time or in "Fix all safe" (STU-0071). Pure.
 */
export const withoutKindGuesses = (findings: readonly Finding[]): Finding[] =>
  findings.map((finding) => {
    if (finding.rule !== "V002") return finding;
    const { suggestedName: _name, fix: _fix, ...rest } = finding;
    return rest;
  });
