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
interface Arrangeable {
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

/**
 * What dropping one item on another asks for (STU-0102): among items of the same kind in the same folder, a
 * new order with the dragged item where the other was; on anything else, a move into it. Null for a drop
 * on itself or on something inside it.
 */
export function dropAction(root: Arrangeable, dragged: string, target: string): ArrangeAction | null {
  if (dragged === "" || dragged === target || target.startsWith(`${dragged}/`)) return null;
  const item = findFolder(root, dragged);
  const onto = findFolder(root, target);
  if (item === undefined || onto === undefined || item.kind === null) return null;
  if (target !== "" && parentPath(dragged) === parentPath(target) && item.kind === onto.kind) {
    const order = siblingsOf(root, item);
    const to = order.indexOf(onto.name);
    order.splice(order.indexOf(item.name), 1);
    order.splice(to, 0, item.name);
    return { action: "reorder", folder: parentPath(dragged), order };
  }
  return { action: "move", item: dragged, into: target };
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
