import { buildCourseTree, validate, type CourseNode } from "@tutors/course-rules";
import courseRulesManifest from "@tutors/course-rules/deno.json";
import type { CourseFolder } from "../../../domain/course-map.ts";
import type { CourseRulesPort } from "../../../application/ports/course-rules.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

const toFolder = (node: CourseNode): CourseFolder => ({
  name: node.name,
  path: node.path,
  kind: node.kind,
  files: node.files.map((file) => ({ name: file.name, path: file.path })),
  children: node.children.map(toFolder),
});

/** @tutors/course-rules behind CourseRulesPort. The only file in Studio that imports it (ADR 0003). */
export const courseRules: CourseRulesPort = {
  version: courseRulesManifest.version,
  async buildTree(fs: FileSystemPort) {
    return toFolder(await buildCourseTree(fs));
  },
  validate(fs: FileSystemPort) {
    return validate(fs);
  },
};
