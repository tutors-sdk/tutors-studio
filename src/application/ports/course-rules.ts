import type { CourseFolder } from "../../domain/course-map.ts";
import type { Finding } from "../../domain/finding.ts";
import type { FileSystemPort } from "./file-system.ts";

/** Driven port: @tutors/course-rules, pinned (ADR 0003). A fake with canned findings drives UI tests. */
export interface CourseRulesPort {
  /** The version of the rules in use, shown in Settings and in bug reports. */
  readonly version: string;
  buildTree(fs: FileSystemPort): Promise<CourseFolder>;
  validate(fs: FileSystemPort): Promise<Finding[]>;
}
