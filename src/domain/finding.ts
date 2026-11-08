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
}

export const errorsFirst = (findings: readonly Finding[]): Finding[] => {
  const rank: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity] || a.path.localeCompare(b.path));
};
