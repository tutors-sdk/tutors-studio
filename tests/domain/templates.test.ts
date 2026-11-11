import { describe, expect, it } from "vitest";
import { checkAnswers, defaultShape, type CourseAnswers } from "../../src/domain/new-course.ts";
import {
  courseTemplates,
  describeTemplateCourse,
  hasTemplateStarterText,
  sectionsFor,
  templateById,
  templateFiles,
  TEMPLATE_LENGTHS,
  templateStarter,
} from "../../src/domain/templates.ts";

const good: CourseAnswers = { name: "Web Development", lecturer: "", weeks: 6, shape: defaultShape, project: false, template: "lecture-lab" };

describe("starter templates", () => {
  it("each template has its own id, a week and something beside the weeks", () => {
    expect(new Set(courseTemplates.map((t) => t.id)).size).toBe(courseTemplates.length);
    for (const template of courseTemplates) {
      expect(template.items.length).toBeGreaterThan(0);
      expect(template.side.length).toBeGreaterThan(0);
      expect(templateById(template.id)).toBe(template);
    }
    expect(templateById("bootcamp")).toBeUndefined();
  });

  it("weeks fall into one section up to four, two up to ten and three for twelve, each week once and in order", () => {
    expect(sectionsFor(2)).toEqual([[1, 2]]);
    expect(sectionsFor(4)).toEqual([[1, 2, 3, 4]]);
    expect(sectionsFor(6)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(sectionsFor(10).map((s) => s.length)).toEqual([5, 5]);
    expect(sectionsFor(12).map((s) => s.length)).toEqual([4, 4, 4]);
    for (const weeks of TEMPLATE_LENGTHS) expect(sectionsFor(weeks).flat()).toEqual(Array.from({ length: weeks }, (_, i) => i + 1));
  });

  it("a template answer needs a known template and one of the offered lengths, and ignores the shaped week", () => {
    expect(checkAnswers(good)).toEqual([]);
    expect(checkAnswers({ ...good, shape: { lectures: 0, labs: 0, readings: 0 } })).toEqual([]);
    expect(checkAnswers({ ...good, weeks: 5 }).map((p) => p.field)).toEqual(["weeks"]);
    expect(checkAnswers({ ...good, template: "bootcamp" as never, weeks: 3, name: "" }).map((p) => p.field)).toEqual(["name", "template", "weeks"]);
  });

  it("only the last week of a six-week course is a review, holding the quiz it is given", () => {
    const files = templateFiles(templateById("seminar")!, 6, "QUIZ");
    expect(files.filter((f) => f.path.endsWith("quiz.md"))).toEqual([{ path: "unit-2/topic-06/quiz-01-check-your-understanding/quiz.md", content: "QUIZ" }]);
    expect(templateFiles(templateById("seminar")!, 4, "QUIZ").some((f) => f.content === "QUIZ")).toBe(false);
  });

  it("every page a template writes still holds starter text, and a page the lecturer wrote does not", () => {
    for (const template of courseTemplates)
      for (const file of templateFiles(template, 6, `# Quiz\n\n${templateStarter.quiz}\n`).filter((f) => f.path.endsWith(".md")))
        expect({ path: file.path, starter: hasTemplateStarterText(file.content) }).toEqual({ path: file.path, starter: true });
    expect(hasTemplateStarterText("# Week 1\n\nHTML, CSS and the box model.\n")).toBe(false);
  });

  it("the plan's summary names the template, the sections and the review week", () => {
    expect(describeTemplateCourse(templateById("project")!, 12)).toBe("the Project-based template: 12 weeks in 3 sections, ending with a review week");
    expect(describeTemplateCourse(templateById("project")!, 2)).toBe("the Project-based template: 2 weeks");
  });
});
