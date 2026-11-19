// The nightly mutation floors (design doc, "For contributors"): Stryker's score for each ring, from its JSON
// report, against tests/mutation/floors.json. A score below its floor fails; floors only rise, by
// `pnpm mutation:floors --raise` in a pull request once a nightly shows the higher score.
import { readFileSync, writeFileSync } from "node:fs";

const FLOORS = "tests/mutation/floors.json";
const REPORT = "reports/mutation/mutation.json";

type Status = "Killed" | "Timeout" | "Survived" | "NoCoverage" | "CompileError" | "RuntimeError" | "Ignored" | "Pending";
export interface Report {
  files: Record<string, { mutants: { status: Status }[] }>;
}

/** Stryker's mutation score for the files under each ring: detected over valid mutants, to one decimal. */
export function scores(report: Report, rings: string[]): Record<string, number> {
  return Object.fromEntries(
    rings.map((ring) => {
      const mutants = Object.entries(report.files)
        .filter(([file]) => file.replaceAll("\\", "/").startsWith(`${ring}/`))
        .flatMap(([, file]) => file.mutants);
      const valid = mutants.filter((m) => !["CompileError", "RuntimeError", "Ignored", "Pending"].includes(m.status));
      const detected = valid.filter((m) => m.status === "Killed" || m.status === "Timeout").length;
      return [ring, valid.length === 0 ? 100 : Math.floor((1000 * detected) / valid.length) / 10];
    }),
  );
}

/** The rings below their floor, and the floors a raise would write (never lower than now). */
export function judge(floors: Record<string, number>, found: Record<string, number>): { drops: string[]; raised: Record<string, number> } {
  const drops = Object.keys(floors)
    .filter((ring) => found[ring] < floors[ring])
    .map((ring) => `${ring}: ${found[ring]}% is below its floor of ${floors[ring]}%`);
  const raised = Object.fromEntries(Object.keys(floors).map((ring) => [ring, Math.max(floors[ring], Math.floor(found[ring]))]));
  return { drops, raised };
}

if (process.argv[1]?.endsWith("mutation-floors.ts")) {
  const floors = JSON.parse(readFileSync(FLOORS, "utf8")) as Record<string, number>;
  const found = scores(JSON.parse(readFileSync(REPORT, "utf8")) as Report, Object.keys(floors));
  const { drops, raised } = judge(floors, found);
  for (const ring of Object.keys(floors)) console.log(`${ring}: ${found[ring]}% (floor ${floors[ring]}%)`);
  if (process.argv.includes("--raise")) {
    writeFileSync(FLOORS, `${JSON.stringify(raised, null, 2)}\n`);
    console.log(`Wrote ${FLOORS}.`);
  } else if (drops.length > 0) {
    console.error(drops.join("\n"));
    process.exitCode = 1;
  } else if (JSON.stringify(raised) !== JSON.stringify(floors)) {
    console.log(`Higher than the floors: run pnpm mutation:floors --raise after a nightly to keep it (${JSON.stringify(raised)}).`);
  }
}
