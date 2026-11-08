import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildCourseMap, flatten, labelFor, type CourseFolder } from "../../src/domain/course-map.ts";
import { errorsFirst, type Finding } from "../../src/domain/finding.ts";
import { slugify } from "../../src/domain/slug.ts";

const folder = (path: string, kind: string | null, children: CourseFolder[] = [], files: string[] = []): CourseFolder => ({
  name: path.slice(path.lastIndexOf("/") + 1),
  path,
  kind,
  files: files.map((name) => ({ name, path: path === "" ? name : `${path}/${name}` })),
  children,
});
const f = (rule: string, path: string, severity: Finding["severity"] = "error"): Finding => ({ rule, severity, path, message: rule });

const tree = folder(
  "",
  "course",
  [folder("topic-01", "topic", [folder("topic-01/lab-01", "lab", [], ["notes.md"])]), folder("Week 3", null, [folder("Week 3/talk-01", "talk")])],
  ["course.md"],
);

describe("the course map", () => {
  it("labels each folder by kind and marks a V002 folder unpublished", () => {
    const map = buildCourseMap(tree, [f("V002", "Week 3")]);
    const nodes = flatten(map);
    expect(nodes.map((n) => [n.path, n.label, n.unpublished, n.excluded, n.status])).toEqual([
      ["", "Course", false, false, "ok"],
      ["topic-01", "Topic", false, false, "ok"],
      ["topic-01/lab-01", "Lab", false, false, "ok"],
      ["Week 3", null, true, true, "error"],
      ["Week 3/talk-01", null, false, true, "ok"],
    ]);
  });

  it("puts a finding about a file on the folder that holds it, and a root finding on the root", () => {
    const map = buildCourseMap(tree, [f("V004", "topic-01/lab-01/notes.md"), f("V001", ""), f("V006", "properties.yaml", "warn")]);
    const byPath = new Map(flatten(map).map((n) => [n.path, n]));
    expect(byPath.get("topic-01/lab-01")!.findings.map((x) => x.rule)).toEqual(["V004"]);
    expect(byPath.get("")!.findings.map((x) => x.rule)).toEqual(["V001", "V006"]);
    expect(byPath.get("")!.status).toBe("error");
  });

  it("reports the worst severity on a folder", () => {
    const only = (severity: Finding["severity"]) => buildCourseMap(tree, [f("V010", "topic-01", severity)]).children[0].status;
    expect(only("warn")).toBe("warn");
    expect(only("info")).toBe("info");
  });

  it("property: every finding lands on exactly one node, whatever path it names", () => {
    const pathArb = fc.constantFrom("", "topic-01", "topic-01/lab-01", "topic-01/lab-01/notes.md", "Week 3", "Week 3/x.pdf", "Week 3/talk-01", "elsewhere/y.md");
    fc.assert(
      fc.property(fc.array(fc.tuple(pathArb, fc.constantFrom<Finding["severity"]>("error", "warn", "info")), { maxLength: 12 }), (raw) => {
        const findings = raw.map(([path, severity], i) => f(`V${i}`, path, severity));
        const placed = flatten(buildCourseMap(tree, findings)).flatMap((n) => n.findings);
        expect(placed.length).toBe(findings.length);
      }),
    );
  });

  it("names kinds in a lecturer's words", () => {
    expect(labelFor("paneltalk")).toBe("Panel talk");
    expect(labelFor("mystery")).toBe("mystery");
    expect(labelFor(null)).toBeNull();
  });

  it("lists errors first, then by path", () => {
    expect(errorsFirst([f("a", "b", "warn"), f("b", "z"), f("c", "a"), f("d", "a", "info")]).map((x) => x.rule)).toEqual(["c", "b", "a", "d"]);
  });

  it("slugify matches course-rules' folder names", () => {
    expect(slugify("Week 3")).toBe("week-3");
    expect(slugify("Café – Intro")).toBe("cafe-intro");
  });
});
