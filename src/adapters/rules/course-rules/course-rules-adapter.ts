import { buildCourseTree, mermaidBlocks, validate, type CourseNode } from "@tutors/course-rules";
import courseRulesManifest from "@tutors/course-rules/deno.json";
import { defaultSpec, generateCourseFiles, patterns, slugify } from "@tutors/tutors-create/generate";
import { labelFor, type CourseFolder } from "../../../domain/course-map.ts";
import type { CourseAnswers, PatternCard } from "../../../domain/new-course.ts";
import type { CourseRulesPort } from "../../../application/ports/course-rules.ts";
import type { DiagramPort } from "../../../application/ports/diagrams.ts";
import type { FileSystemPort } from "../../../application/ports/file-system.ts";

const toFolder = (node: CourseNode): CourseFolder => ({
  name: node.name,
  path: node.path,
  kind: node.kind,
  files: node.files.map((file) => ({ name: file.name, path: file.path })),
  children: node.children.map(toFolder),
});

const card = (item: { kind: string; title: string }) => ({ label: labelFor(item.kind)!, title: item.title });

/**
 * @tutors/course-rules, and the tutors-create generator it pairs with, behind CourseRulesPort. The only
 * file in Studio that imports either (ADR 0003).
 */
export const courseRules: CourseRulesPort = {
  version: courseRulesManifest.version,
  async buildTree(fs: FileSystemPort) {
    return toFolder(await buildCourseTree(fs));
  },
  validate(fs: FileSystemPort, diagrams?: DiagramPort) {
    return validate(fs, "", diagrams === undefined ? {} : { diagrams: { mermaid: (source) => diagrams.check(source) } });
  },
  diagramsIn(text: string) {
    return mermaidBlocks(text);
  },
  patterns(): PatternCard[] {
    return patterns.map((p) => ({ id: p.id, name: p.name, description: p.description, pickedWhen: p.pickedWhen, week: p.week.map(card), side: p.side.map(card) }));
  },
  newCourseFiles(answers: CourseAnswers) {
    const spec = {
      ...defaultSpec,
      courseName: answers.name.trim(),
      lecturerName: answers.lecturer.trim(),
      courseId: slugify(answers.name),
      pattern: { id: answers.pattern, weeks: answers.weeks, start: answers.start, ...(answers.readingWeek === null ? {} : { readingWeek: answers.readingWeek }) },
    };
    return generateCourseFiles(spec).map((file) => ({ path: file.relativePath, content: file.content }));
  },
};
