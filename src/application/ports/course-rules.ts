import type { CourseFolder } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { CourseAnswers, PatternCard } from "../../domain/new-course.ts";
import type { FileSystemPort } from "./file-system.ts";

/** Driven port: @tutors/course-rules, pinned (ADR 0003). A fake with canned findings drives UI tests. */
export interface CourseRulesPort {
  /** The version of the rules in use, shown in Settings and in bug reports. */
  readonly version: string;
  buildTree(fs: FileSystemPort): Promise<CourseFolder>;
  validate(fs: FileSystemPort): Promise<Finding[]>;
  /** The teaching patterns, in the order the cards are shown. */
  patterns(): PatternCard[];
  /** Every file of a new course from checked answers: the files `tutors create --pattern` writes. Pure. */
  newCourseFiles(answers: CourseAnswers): { path: string; content: string }[];
}
