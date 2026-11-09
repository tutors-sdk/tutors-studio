import { describe, expect, it } from "vitest";
import { checkAnswers, courseFolderName, defaultShape, type CourseAnswers } from "../../src/domain/new-course.ts";

const good: CourseAnswers = { name: "Web Development", lecturer: "", weeks: 12, shape: defaultShape, project: false };
const fields = (answers: Partial<CourseAnswers>) => checkAnswers({ ...good, ...answers }).map((p) => p.field);

describe("the new-course answers", () => {
  it("complete answers have no problems, and the folder is the name as Tutors names folders", () => {
    expect(checkAnswers(good)).toEqual([]);
    expect(checkAnswers({ ...good, weeks: 1, project: true })).toEqual([]);
    expect(courseFolderName(good)).toBe("web-development");
  });

  it("a name with no letter or number is refused", () => {
    expect(fields({ name: "  " })).toEqual(["name"]);
    expect(fields({ name: "!!!" })).toEqual(["name"]);
  });

  it("weeks must be a whole number from 1 to 52", () => {
    for (const weeks of [0, 53, 2.5, Number.NaN]) expect(fields({ weeks })).toEqual(["weeks"]);
    expect(fields({ weeks: 52 })).toEqual([]);
  });

  it("a week holds something, and no more than five of a kind; every problem is named at once", () => {
    expect(fields({ shape: { lectures: 0, labs: 0, readings: 0 } })).toEqual(["shape"]);
    expect(fields({ shape: { lectures: 6, labs: 0, readings: 0 } })).toEqual(["shape"]);
    expect(fields({ name: "", weeks: 99, shape: { lectures: 0, labs: 0, readings: 0 } })).toEqual(["name", "weeks", "shape"]);
  });
});
