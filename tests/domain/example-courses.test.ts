import { describe, expect, it } from "vitest";
import { checkAnswers, defaultShape } from "../../src/domain/new-course.ts";
import { describeExampleCourse, exampleById, exampleCourses, exampleFiles, exampleItemCount } from "../../src/domain/example-courses.ts";
import { hasTemplateStarterText } from "../../src/domain/templates.ts";

const quiz = (title: string) => `# ${title}\n\nCheck what you remember from the module. Replace these questions with your own.\n`;

describe("reference courses (ADR 0041)", () => {
  it("each has its own id, the repository it is shaped on and at least one week", () => {
    expect(exampleCourses.map((example) => example.id)).toEqual(["web-dev-2", "mobile-app-dev", "agile-soft-dev", "reference-course", "lc-cs"]);
    for (const example of exampleCourses) {
      expect(exampleById(example.id)).toBe(example);
      expect(example.modelledOn).toMatch(/^[\w-]+\/[\w-]+$/);
      expect(example.weeks.length).toBeGreaterThan(0);
    }
  });

  it("writes one topic per week, numbered in order, without the number the title carries in its folder name", () => {
    const paths = exampleFiles(exampleById("web-dev-2")!, quiz).map((file) => file.path);
    expect(paths.filter((path) => /^topic-\d\d-[^/]+\/topic\.md$/.test(path))).toEqual([
      "topic-01-introducing-javascript/topic.md",
      "topic-02-javascript-arrays/topic.md",
      "topic-03-glitch-overview/topic.md",
      "topic-04-web-applications/topic.md",
      "topic-05-templates-routes/topic.md",
      "topic-06-forms/topic.md",
      "topic-07-sessions/topic.md",
      "topic-08-weather-top-v2/topic.md",
    ]);
    expect(paths).toContain("topic-01-introducing-javascript/unit-1-introducing-javascript/lab-01-js-intro/00.Lab-01-JS-Intro.md");
  });

  it("every page it writes is starter text for the lecturer to write over, never the original's words", () => {
    for (const example of exampleCourses)
      for (const file of exampleFiles(example, quiz).filter((f) => f.path.endsWith(".md") && !/\/(web|unit|side)\.md$/.test(f.path)))
        expect({ path: `${example.id}/${file.path}`, starter: hasTemplateStarterText(file.content) }).toEqual({ path: `${example.id}/${file.path}`, starter: true });
  });

  it("a reference course answer needs only a known course and a name", () => {
    const answers = { name: "Web Development II", lecturer: "", weeks: 0, shape: defaultShape, project: false, example: "web-dev-2" };
    expect(checkAnswers(answers)).toEqual([]);
    expect(checkAnswers({ ...answers, example: "bootcamp", name: "" }).map((p) => p.field)).toEqual(["name", "template"]);
  });

  it("the plan's summary names the course, where it comes from and its size", () => {
    expect(exampleItemCount(exampleById("web-dev-2")!)).toBe(51);
    expect(describeExampleCourse(exampleById("web-dev-2")!)).toBe("the Web Development II template (shaped on edeleastar/module-web-dev-2-2022): 8 weeks, 51 items");
  });
});
