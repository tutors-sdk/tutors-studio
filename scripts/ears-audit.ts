/**
 * The EARS gate (ADR 0008). Reads the register (spec/ears/*.md), the features (spec/features/*.feature)
 * and the steps (spec/steps/*.steps.ts) and fails when they disagree. See spec/ears/README.md.
 *
 *   pnpm ears:audit            # exit 1 on any violation
 *   pnpm ears:audit --next-id  # print the next free STU id
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface RegisterEntry {
  id: string;
  pattern: string;
  text: string;
  file: string;
  /** A struck-through id: kept so it is never reused, with no Rule, no steps, and no checks of its words. */
  retired: boolean;
}
export interface FeatureRule {
  id: string | null;
  tag: string | null;
  text: string;
  file: string;
  line: number;
}

const patternTags: Record<string, string> = { ubiquitous: "@ears-ubiquitous", event: "@ears-event", state: "@ears-state", unwanted: "@ears-unwanted", optional: "@ears-optional" };
const firstWordTag: Record<string, string> = { When: "@ears-event", While: "@ears-state", If: "@ears-unwanted", Where: "@ears-optional" };

export function parseRegister(file: string, source: string): RegisterEntry[] {
  return source
    .split("\n")
    .map((line) => /^\|\s*(~~)?(STU-\d{4})(?:~~)?\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|\s*$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ id: m[2], pattern: m[3], text: m[4], file, retired: m[1] !== undefined }));
}

export function parseFeature(file: string, source: string): FeatureRule[] {
  const lines = source.split("\n");
  const rules: FeatureRule[] = [];
  lines.forEach((line, i) => {
    const m = /^\s*Rule:\s*(.+?)\s*$/.exec(line);
    if (!m) return;
    const tags = (lines[i - 1] ?? "").trim().split(/\s+/);
    const id = tags.find((t) => /^@stu-\d{4}$/.test(t));
    rules.push({ id: id ? `STU-${id.slice(5)}` : null, tag: tags.find((t) => t.startsWith("@ears-")) ?? null, text: m[1], file, line: i + 1 });
  });
  return rules;
}

const expectedTag = (text: string) => firstWordTag[text.split(/[\s,]/)[0]] ?? "@ears-ubiquitous";
const literal = (text: string) => JSON.stringify(text);

export function audit(register: RegisterEntry[], rules: FeatureRule[], steps: string): string[] {
  const problems: string[] = [];
  const byId = new Map(register.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  for (const entry of register) {
    if (seen.has(entry.id)) problems.push(`${entry.file}: ${entry.id} is listed twice`);
    seen.add(entry.id);
    if (entry.retired) continue;
    if (patternTags[entry.pattern] === undefined) problems.push(`${entry.file}: ${entry.id} has an unknown pattern "${entry.pattern}"`);
    else if (patternTags[entry.pattern] !== expectedTag(entry.text))
      problems.push(`${entry.file}: ${entry.id} is marked ${entry.pattern} but its wording reads ${expectedTag(entry.text)}`);
    if ((entry.text.match(/\bshall\b/g) ?? []).length !== 1) problems.push(`${entry.file}: ${entry.id} must say "shall" exactly once`);
    if (!rules.some((rule) => rule.id === entry.id)) problems.push(`${entry.file}: ${entry.id} has no Rule in spec/features`);
  }
  for (const rule of rules) {
    const where = `${rule.file}:${rule.line}`;
    if (rule.id === null) {
      problems.push(`${where}: Rule has no @stu-NNNN tag`);
      continue;
    }
    const entry = byId.get(rule.id);
    if (!entry) problems.push(`${where}: ${rule.id} is not in the register`);
    else if (entry.retired) problems.push(`${where}: ${rule.id} is retired; give the behaviour a new id`);
    else if (entry.text !== rule.text) problems.push(`${where}: ${rule.id}'s wording differs from the register`);
    if (rule.tag !== expectedTag(rule.text)) problems.push(`${where}: ${rule.id} should be tagged ${expectedTag(rule.text)}`);
    if (!steps.includes(`Rule(${literal(rule.text)}`)) problems.push(`${where}: ${rule.id} is not bound by any steps file`);
  }
  return problems;
}

export function nextId(register: RegisterEntry[]): string {
  const max = register.reduce((n, entry) => Math.max(n, Number(entry.id.slice(4))), 0);
  return `STU-${String(max + 1).padStart(4, "0")}`;
}

const read = (dir: string, suffix: string) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => ({ file: join(dir, name), source: readFileSync(join(dir, name), "utf-8") }));

if (process.argv[1]?.endsWith("ears-audit.ts")) {
  const register = read("spec/ears", ".md").flatMap(({ file, source }) => parseRegister(file, source));
  if (process.argv.includes("--next-id")) {
    console.log(nextId(register));
  } else {
    const rules = read("spec/features", ".feature").flatMap(({ file, source }) => parseFeature(file, source));
    const steps = read("spec/steps", ".steps.ts")
      .map(({ source }) => source.replace(/\s+/g, " "))
      .join("\n");
    const problems = audit(register, rules, steps.replace(/Rule\( "/g, 'Rule("'));
    for (const problem of problems) console.error(problem);
    console.log(`${problems.length === 0 ? "OK" : "FAIL"}: ${register.length} register entries, ${rules.length} Rules, ${problems.length} problem(s).`);
    process.exitCode = problems.length === 0 ? 0 : 1;
  }
}
