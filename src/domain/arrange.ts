import type { CourseFolder } from "./course-map.ts";
import { labelFor } from "./course-map.ts";
import type { FileOp } from "./plan.ts";

/** What a lecturer asks to change about the course's shape (STU-0095 to STU-0100). */
export type ArrangeAction =
  | { action: "reorder"; folder: string; order: string[] }
  | { action: "move"; item: string; into: string }
  | { action: "retitle"; item: string; title: string }
  | { action: "hide"; item: string; hidden: boolean }
  | { action: "remove"; item: string }
  | { action: "restore"; name: string; into: string };

export function findFolder<T extends { path: string; children: T[] }>(root: T, path: string): T | undefined {
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findFolder(child, path);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** What to call a folder in a sentence: its title, else its name; the course is "the course". */
const called = (root: CourseFolder, path: string) => {
  if (path === "") return "the course";
  const folder = findFolder(root, path);
  return `"${folder?.title ?? path.slice(path.lastIndexOf("/") + 1)}"`;
};

/** The one line a plan shows for an arrangement, in the lecturer's words. */
export function arrangeSummary(root: CourseFolder, action: ArrangeAction): string {
  switch (action.action) {
    case "reorder": {
      const kind = findFolder(root, action.folder === "" ? action.order[0] : `${action.folder}/${action.order[0]}`)?.kind ?? null;
      // A lecturer knows a topic as a week, as every other screen calls it.
      const label = kind === "topic" ? "week" : (labelFor(kind) ?? "item").toLowerCase();
      return `Put the ${label}s in ${called(root, action.folder)} in a new order`;
    }
    case "move":
      return `Move ${called(root, action.item)} to ${called(root, action.into)}`;
    case "retitle":
      return `Rename ${called(root, action.item)} to "${action.title.replace(/\s+/g, " ").trim()}"`;
    case "hide":
      return action.hidden ? `Hide ${called(root, action.item)} from students` : `Show ${called(root, action.item)} to students again`;
    case "remove":
      return `Remove ${called(root, action.item)} to the bin`;
    case "restore":
      return `Put "${action.name}" back in ${called(root, action.into)}`;
  }
}

/** Where the lecturer's eye should be once an arrangement applies: the item where it now is, or the folder it left. */
export function arrangedSelection(action: ArrangeAction, ops: readonly FileOp[]): string {
  const finalMove = (from: string) => {
    const moved = ops.find((op): op is Extract<FileOp, { op: "move" }> => op.op === "move" && op.from === from);
    return moved?.to ?? from;
  };
  switch (action.action) {
    case "reorder":
      return action.folder;
    case "move":
      return finalMove(action.item);
    case "remove":
      return action.item.includes("/") ? action.item.slice(0, action.item.lastIndexOf("/")) : "";
    case "restore": {
      const moved = ops.find((op): op is Extract<FileOp, { op: "move" }> => op.op === "move");
      return moved?.to ?? action.into;
    }
    default:
      return action.item;
  }
}

/** A folder in the course as the screens hold it: enough to work out what a drag or a step means. */
export interface Arrangeable {
  path: string;
  name: string;
  kind: string | null;
  children: Arrangeable[];
}

const parentPath = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/** The items of one kind in a folder, in the order Tutors shows them: by name. */
const siblingsOf = (root: Arrangeable, item: Arrangeable) =>
  (findFolder(root, parentPath(item.path))?.children ?? [])
    .filter((child) => child.kind === item.kind)
    .map((child) => child.name)
    .sort();

/** Where a drop lands on the row it was dropped on: just above it, just below it, or inside it. */
export type DropPlace = "before" | "after" | "into";

const CONTAINERS = ["topic", "unit", "side"];

/** Whether Tutors shows an item of `kind` inside a folder of `container`'s kind: weeks in the course, units and sides in a week, items in either. */
export function canHold(container: string | null, kind: string | null): boolean {
  if (kind === null) return false;
  if (container === "course") return kind === "topic";
  if (container === "topic") return kind !== "topic" && kind !== "course";
  if (container === "unit" || container === "side") return !CONTAINERS.includes(kind) && kind !== "course";
  return false;
}

/** The folder above `path`, or undefined above the course. */
const above = (root: Arrangeable, path: string) => (path === "" ? undefined : findFolder(root, parentPath(path)));

/**
 * What a drop asks for (STU-0144, STU-0145). Dropped into a folder that can hold it, the item moves there.
 * Dropped above or below an item of its kind in its own folder (or anywhere inside one, as a week dropped
 * on a lecture in another week), it goes just before or just after it. Anywhere else, it moves into the
 * nearest folder that can hold it, never into an item. "into" on an item of its own kind takes that item's place.
 * Null when nothing would change, or for a drop on itself or inside itself.
 */
export function dropAction(root: Arrangeable, dragged: string, target: string, place: DropPlace = "into"): ArrangeAction | null {
  if (dragged === "" || dragged === target || target.startsWith(`${dragged}/`)) return null;
  const item = findFolder(root, dragged);
  const onto = findFolder(root, target);
  if (item === undefined || onto === undefined || item.kind === null) return null;
  if (place === "into" && canHold(onto.kind, item.kind)) return parentPath(dragged) === target ? null : { action: "move", item: dragged, into: target };

  // The item of the dragged one's kind at or above where it was dropped.
  let anchor: Arrangeable | undefined = onto;
  while (anchor !== undefined && anchor.kind !== item.kind) anchor = above(root, anchor.path);
  if (anchor !== undefined && anchor.path !== dragged && parentPath(anchor.path) === parentPath(dragged)) {
    const now = siblingsOf(root, item);
    // "into" an item of its own kind takes its place: before it when coming from below, after it when from above.
    const after = place === "after" || (place === "into" && now.indexOf(item.name) < now.indexOf(anchor.name));
    const order = now.filter((name) => name !== item.name);
    order.splice(order.indexOf(anchor.name) + (after ? 1 : 0), 0, item.name);
    return order.every((name, i) => name === now[i]) ? null : { action: "reorder", folder: parentPath(dragged), order };
  }
  let home: Arrangeable | undefined = anchor === undefined ? onto : above(root, anchor.path);
  while (home !== undefined && !canHold(home.kind, item.kind)) home = above(root, home.path);
  if (home === undefined || home.path === parentPath(dragged)) return null;
  return { action: "move", item: dragged, into: home.path };
}

/** The week files dropped on a row go to (STU-0146): the week itself, or the week the row's item is in. Null outside any week. */
export function weekFor(root: Arrangeable, path: string): string | null {
  for (let at = findFolder(root, path); at !== undefined; at = above(root, at.path)) if (at.kind === "topic") return at.path;
  return null;
}

/** Moving an item one place earlier (-1) or later (1) among its kind: the keyboard's way to reorder. Null at either end. */
export function stepAction(root: Arrangeable, path: string, by: -1 | 1): ArrangeAction | null {
  const item = findFolder(root, path);
  if (item === undefined || item.kind === null || path === "") return null;
  const order = siblingsOf(root, item);
  const at = order.indexOf(item.name);
  const to = at + by;
  if (to < 0 || to >= order.length) return null;
  [order[at], order[to]] = [order[to], order[at]];
  return { action: "reorder", folder: parentPath(path), order };
}
