import { describe, expect, it } from "vitest";
import { checkAnswers, courseFolderName, type CourseAnswers } from "../../src/domain/new-course.ts";

const ids = ["lecture-lab", "flipped"];
const good: CourseAnswers = { name: "Web Development", lecturer: "", start: "2027-01-25", weeks: 12, readingWeek: 6, pattern: "lecture-lab" };
const fields = (answers: Partial<CourseAnswers>) => checkAnswers({ ...good, ...answers }, ids).map((p) => p.field);

describe("the three answers", () => {
  it("complete answers have no problems, and the folder is the name as Tutors names folders", () => {
    expect(checkAnswers(good, ids)).toEqual([]);
    expect(checkAnswers({ ...good, readingWeek: null, weeks: 1 }, ids)).toEqual([]);
    expect(courseFolderName(good)).toBe("web-development");
  });

  it("a name with no letter or number is refused", () => {
    expect(fields({ name: "  " })).toEqual(["name"]);
    expect(fields({ name: "!!!" })).toEqual(["name"]);
  });

  it("the start must be a real calendar date", () => {
    for (const start of ["", "2027-02-30", "25/01/2027", "2027-1-5"]) expect(fields({ start })).toEqual(["start"]);
    expect(fields({ start: "2028-02-29" })).toEqual([]);
  });

  it("weeks must be a whole number from 1 to 52", () => {
    for (const weeks of [0, 53, 2.5, Number.NaN]) expect(fields({ weeks, readingWeek: null })).toEqual(["weeks"]);
    expect(fields({ weeks: 52, readingWeek: null })).toEqual([]);
  });

  it("a reading week must follow a teaching week before the last, and is not judged when weeks are wrong", () => {
    for (const readingWeek of [0, 12, 13, 1.5]) expect(fields({ readingWeek })).toEqual(["readingWeek"]);
    expect(fields({ readingWeek: 11 })).toEqual([]);
    expect(fields({ weeks: 0, readingWeek: 40 })).toEqual(["weeks"]);
    expect(checkAnswers({ ...good, readingWeek: 12 }, ids)[0].message).toBe("The reading week must follow a teaching week from 1 to 11.");
  });

  it("the pattern must be one offered, and every problem is named at once", () => {
    expect(fields({ pattern: "seminar" })).toEqual(["pattern"]);
    expect(fields({ name: "", start: "", weeks: 99, pattern: "" })).toEqual(["name", "start", "weeks", "pattern"]);
  });
});
