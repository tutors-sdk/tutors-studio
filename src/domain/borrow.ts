import type { MapNode } from "./course-map.ts";
import type { ComposePick } from "./compose.ts";
import { PICKABLE } from "./compose.ts";
import type { LibraryItem } from "./library.ts";

/**
 * Borrowing from the library into a course the lecturer already has (ADR 0070): a whole unit, a week or one item,
 * copied into the folders of the open course. Always a copy, as composing is (ADR 0062).
 */

/** What can be borrowed into a course: what can be composed, and a whole unit too. */
export const borrowable = (item: LibraryItem): boolean => PICKABLE.has(item.kind) || item.kind === "unit";

/** Where a pick goes in the open course: a folder of it, or "" for a new week or unit at the end of the course. */
export interface BorrowPick {
  course: ComposePick["course"];
  item: LibraryItem;
  into: string;
}

/** A place in the open course a pick can go. */
export interface BorrowPlace {
  /** The folder; "" is the end of the course, as a new week or unit. */
  folder: string;
  label: string;
}

/** The end of the course, where a borrowed week or unit is added as a new one. */
export const AT_THE_END = "";

/** The sentence every plan that borrows into a course carries (STU-0333). */
export const BORROW_NOTICE =
  "Studio copies each item into this course's folder. The course gets its own copy: changing it won't change the original, and later changes to the original won't reach this course.";

/**
 * The places in the open course where a pick can go, in the order the course map shows them (STU-0332): a unit is
 * added only at the end of the course; a week at the end, into a unit as its next week, or into a week, which
 * takes its items; an item into a week or the module's own unit. Pure.
 */
export function borrowPlaces(map: MapNode, kind: string): BorrowPlace[] {
  const places: BorrowPlace[] = [];
  if (kind === "unit" || kind === "topic")
    places.push({ folder: AT_THE_END, label: kind === "unit" ? "A new unit at the end of the course" : "A new week at the end of the course" });
  if (kind === "unit") return places;
  const sides: BorrowPlace[] = [];
  const walk = (node: MapNode, within: string) => {
    for (const child of node.children) {
      if (child.excluded) continue;
      const title = child.title ?? child.name;
      if (child.kind === "unit") {
        if (kind === "topic") places.push({ folder: child.path, label: `${title}, as its next week` });
        walk(child, title);
      } else if (child.kind === "topic") places.push({ folder: child.path, label: within === "" ? title : `${within}: ${title}` });
      // The module's own unit holds items, not weeks; it comes last.
      else if (child.kind === "side" && kind !== "topic") sides.push({ folder: child.path, label: `${title} (the module's own unit)` });
    }
  };
  walk(map, "");
  return [...places, ...sides];
}

/** Where a pick goes until the lecturer moves it: a week or unit at the end, an item in the first week. Pure. */
export const firstPlace = (places: readonly BorrowPlace[]): string => places[0]?.folder ?? AT_THE_END;
