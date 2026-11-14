/** The shape of a reference course (ADR 0041): what example-courses-data.ts holds. */
import type { TemplateKind } from "./templates.ts";

export type ExampleKind = TemplateKind | "web" | "quiz";

export interface ExampleItem {
  kind: ExampleKind;
  title: string;
  /** A lab's steps after its first, by title. */
  steps?: string[];
  /** A web link's address. */
  url?: string;
}

/** A unit inside a week, or a side unit (shown beside the week's cards) when `side` is true. */
export interface ExampleUnit {
  title: string;
  side: boolean;
  items: ExampleItem[];
}

export interface ExampleWeek {
  title: string;
  /** Items directly in the week, outside any unit. */
  items: ExampleItem[];
  units: ExampleUnit[];
}

export interface ExampleCourse {
  id: string;
  /** The original course's own title. */
  name: string;
  /** The repository it is shaped on, owner/name. */
  modelledOn: string;
  /** What the course holds, in a sentence. */
  summary: string;
  weeks: ExampleWeek[];
  /** Side units beside the weeks, at the course's top level. */
  side: ExampleUnit[];
  /** Panel items on the course's own page. */
  home: ExampleItem[];
}
