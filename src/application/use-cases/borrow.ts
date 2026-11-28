import { AT_THE_END, BORROW_NOTICE, borrowable, type BorrowPick } from "../../domain/borrow.ts";
import { borrowedWords, copiedName, creditsPage, SOURCES_FILE, type Source } from "../../domain/compose.ts";
import { lastPart } from "../../domain/library.ts";
import type { FileOp, Plan } from "../../domain/plan.ts";
import type { FileSystemPort } from "../ports/file-system.ts";
import { itemFiles, Tampered, type ComposeDeps } from "./compose-course.ts";
import { digestOf, type StoredFile } from "./stored-files.ts";

export type BorrowPlan = { ok: true; plan: Plan; notes: string[] } | { ok: false; problems: string[] };

const joined = (dir: string, name: string) => (dir === "" ? name : `${dir}/${name}`);
/** The Borrowed material page's folder, wherever an earlier borrow put it. */
const CREDITS = /^note-\d+-borrowed/;

/**
 * The plan that copies library picks into a course the lecturer already has (STU-0332, STU-0333): a unit becomes
 * the course's next unit; a week its next week, or the next week of a unit, or its items join a week; an item takes
 * the next free number of its kind in its week. Each copy is added to the course's sources record and the Borrowed
 * material page is written again from it, keeping what was borrowed before (STU-0334). Reads the course and the
 * library; writes nothing.
 */
export async function planBorrow(deps: Omit<ComposeDeps, "rules">, course: FileSystemPort, picks: readonly BorrowPick[]): Promise<BorrowPlan> {
  if (picks.length === 0) return { ok: false, problems: ["Pick at least one unit, week or item from your library."] };
  const wrong = picks.find((pick) => !borrowable(pick.item) || (pick.into === AT_THE_END && pick.item.kind !== "topic" && pick.item.kind !== "unit"));
  if (wrong) return { ok: false, problems: [borrowable(wrong.item) ? `Choose a week for ${wrong.item.title}.` : `${wrong.item.title} can't be copied on its own.`] };

  const files = new Map<string, Uint8Array>();
  const listed = new Map<string, string[]>();
  const namesIn = async (dir: string): Promise<string[]> => {
    if (!listed.has(dir))
      listed.set(
        dir,
        await course.list(dir).then(
          (entries) => entries.map((entry) => entry.name),
          () => [],
        ),
      );
    const names = new Set(listed.get(dir));
    for (const path of files.keys()) if (dir === "" || path.startsWith(`${dir}/`)) names.add(path.slice(dir === "" ? 0 : dir.length + 1).split("/")[0]);
    return [...names];
  };
  const sources: Record<string, Source> = (await course.exists(SOURCES_FILE))
    ? (JSON.parse(new TextDecoder().decode(await course.read(SOURCES_FILE))) as Record<string, Source>)
    : {};

  for (const pick of picks) {
    let copied: StoredFile[];
    try {
      copied = await itemFiles(deps.library, { course: pick.course, item: pick.item, week: 0 });
    } catch (error) {
      if (error instanceof Tampered) return { ok: false, problems: [error.message] };
      throw error;
    }
    let destination: string;
    const intoWeek = pick.item.kind === "topic" && pick.into !== AT_THE_END && /(^|\/)topic[^/]*$/.test(pick.into);
    if (intoWeek) {
      // A week into a week: its items join the week, each under the next free number of its kind; its own page stays behind.
      destination = pick.into;
      const renamed = new Map<string, string>();
      for (const file of copied) {
        const [first, ...rest] = file.path.split("/");
        if (rest.length === 0) {
          if (first !== "topic.md" && !(await namesIn(destination)).includes(first)) files.set(joined(destination, first), file.bytes);
          continue;
        }
        if (!renamed.has(first)) renamed.set(first, copiedName(/^[a-z]+/.exec(first)?.[0] ?? first, first, await namesIn(destination)));
        files.set(joined(destination, `${renamed.get(first)}/${rest.join("/")}`), file.bytes);
      }
    } else {
      const kind = pick.item.kind;
      destination = joined(pick.into, copiedName(kind, lastPart(pick.item.path), await namesIn(pick.into)));
      for (const file of copied) files.set(`${destination}/${file.path}`, file.bytes);
    }
    const key = intoWeek ? `${destination}#${pick.course.title}/${pick.item.path}` : destination;
    sources[key] = {
      library: pick.course.library,
      course: pick.course.path,
      path: pick.item.path,
      from: pick.course.entry?.from ?? pick.course.title,
      title: pick.item.title,
      digest: await digestOf(copied),
      copied: deps.today(),
      ...(pick.course.entry
        ? { shared: { publisher: pick.course.entry.publisher, name: pick.course.entry.name, version: pick.course.entry.version, licence: pick.course.entry.licence } }
        : {}),
    };
  }

  const encoder = new TextEncoder();
  files.set(`${await creditsFolder(course, namesIn)}/note.md`, encoder.encode(creditsPage(sources)));
  files.set(SOURCES_FILE, encoder.encode(`${JSON.stringify(sources, null, 2)}\n`));
  const ops: FileOp[] = [...files].map(([path, content]) => ({ op: "write", path, content }));
  const asPicks = picks.map((pick) => ({ ...pick, week: 0 }));
  return {
    ok: true,
    plan: { id: deps.newId(), summary: `Copy ${borrowedWords(asPicks)} into this course`, ops },
    notes: [BORROW_NOTICE, "A page called Borrowed material says what came from where."],
  };
}

/** Where the Borrowed material page is: where an earlier borrow put it, else in the module's own unit, else at the top of the course. */
async function creditsFolder(course: FileSystemPort, namesIn: (dir: string) => Promise<string[]>): Promise<string> {
  const top = await namesIn("");
  const sides = top.filter((name) => /^side/.test(name)).sort();
  for (const dir of ["", ...sides]) {
    const found = (await namesIn(dir)).find((name) => CREDITS.test(name));
    if (found !== undefined) return joined(dir, found);
  }
  const home = sides[0] ?? "";
  return joined(home, copiedName("note", "note-borrowed", await namesIn(home)));
}
