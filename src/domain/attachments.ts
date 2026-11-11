/**
 * Files that belong to a page (docs/course-files.md, ADR 0040). Tutors has no course-wide files folder: a
 * file belongs to the learning object that shows it. A PDF that is the material gets its own card (a
 * Talk); a file a note or a lab step links to lives in that note's or lab's archives/ folder, the one place
 * the reader resolves a link to (with img/ and archive/). Pure: names, paths and bytes only.
 */
import type { FileOp } from "./plan.ts";
import { zipStored } from "./zip.ts";

/** The folder inside a note or lab that holds the files its pages link to, as the reference course names it. */
export const ATTACHMENTS = "archives";

/**
 * The file types the Tutors generator copies to the course's site (tutors-model-lib `assetTypes`), in lower
 * case. The generator compares extensions as written, so "Slides.PDF" is not copied; Studio lower-cases them.
 */
const PUBLISHED = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "mov",
  "mp4",
  "pdf",
  "zip",
  "html",
  "htm",
  "yaml",
  "xls",
  "xlsx",
  "xlsm",
  "csv",
  "pkt",
  "css",
  "kt",
  "json",
  "java",
  "py",
  "js",
  "marp",
  "excalidraw",
]);
const PICTURES = new Set(["png", "jpg", "jpeg", "gif", "svg"]);

const extensionOf = (name: string) => (name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".") + 1) : "");
const baseOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const folderOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

/** Whether Tutors copies a file of this name to the course's site, as Studio names it (extension in lower case). */
export const tutorsPublishes = (name: string) => PUBLISHED.has(extensionOf(name).toLowerCase());

/**
 * Whether a folder holds pages that can link files: a note or a lab (book- is the older name for lab). A
 * topic, unit or course page can't: Tutors would flag an archives/ folder there as a folder it leaves out.
 */
export function attachesFiles(folder: string): boolean {
  return /^(panelnote|note(?!book)|lab|book)/.test(baseOf(folder));
}

/** A file's name as an attachment: ASCII, no spaces, extension in lower case ("Brief Café.DOCX" becomes "Brief-Cafe.docx"). */
export function attachmentName(name: string): string {
  const dot = name.lastIndexOf(".");
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, ""];
  const clean = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "");
  const ext = clean(extension).toLowerCase();
  return `${clean(stem) || "file"}${ext ? `.${ext}` : ""}`;
}

/** A name not among `taken`: "brief.pdf", then "brief-2.pdf", "brief-3.pdf" ... */
function freeName(name: string, taken: ReadonlySet<string>): string {
  const dot = name.lastIndexOf(".");
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let candidate = name;
  for (let n = 2; taken.has(candidate); n++) candidate = `${stem}-${n}${extension}`;
  return candidate;
}

/** What a page shows as a download's link text: the file's name without its extension, hyphens as spaces. */
export const downloadLabel = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim() || name;

/** Studio's words for attaching a file; these are about the editor, not a rule. */
export const attachWords = {
  notHere: "Files can be attached to notes and lab steps. To show a PDF as its own card, drop it on the week instead.",
  empty: (name: string) => `"${name}" is empty, so there is nothing to attach.`,
} as const;

/** One file attached to a page: where it is saved in the course, and the address the page links it by. */
export interface Attachment {
  path: string;
  bytes: Uint8Array;
  /** Relative to the page's folder: "archives/brief.pdf". */
  address: string;
  label: string;
}

/**
 * A file attached to a page in `folder` (a note or lab): saved in the folder's archives/, zipped when
 * Tutors doesn't publish its type (a Word file becomes brief.docx.zip, as Tutors courses already do), and
 * never over a file already there.
 */
export function attachmentFor(folder: string, file: { path: string; bytes: Uint8Array }, taken: ReadonlySet<string>): Attachment {
  const name = attachmentName(baseOf(file.path));
  const published = tutorsPublishes(name);
  const stored = freeName(published ? name : `${name}.zip`, taken);
  return {
    path: `${folder}/${ATTACHMENTS}/${stored}`,
    bytes: published ? file.bytes : zipStored([{ name, bytes: file.bytes }]),
    address: `${ATTACHMENTS}/${stored}`,
    label: downloadLabel(name),
  };
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A page's markdown with every link to `from` (written plainly, with ./, or URL-encoded) pointed at `to`. */
export function relinked(markdown: string, from: string, to: string): string {
  const forms = [...new Set([from, encodeURI(from), from.replace(/ /g, "%20")])].map(escape).join("|");
  return markdown.replace(new RegExp(`(\\]\\(\\s*<?)(?:\\./)?(?:${forms})(?=>?[\\s)])`, "g"), `$1${to}`);
}

/**
 * Written files placed where Tutors publishes them and the reader finds them (docs/course-files.md):
 *  - an extension in upper case is lower-cased, since the generator only copies "pdf", not "PDF";
 *  - a file other than a page or a picture written straight into a note or lab goes into its archives/
 *    folder, zipped when Tutors doesn't publish its type. A PDF loose in a lab would otherwise replace
 *    the lab's steps with that PDF, and a Word file would never reach the site at all;
 *  - every page in the same folder that linked the file by its old name links the new one.
 * Moves and every other write are kept as they are.
 */
export function placedForTutors(ops: readonly FileOp[]): FileOp[] {
  const out: FileOp[] = ops.map((op) => ({ ...op }));
  const writes = out.filter((op): op is Extract<FileOp, { op: "write" }> => op.op === "write");
  const taken = new Map<string, Set<string>>();
  const takenIn = (folder: string) => {
    if (!taken.has(folder)) taken.set(folder, new Set(writes.filter((op) => folderOf(op.path) === folder).map((op) => baseOf(op.path))));
    return taken.get(folder)!;
  };
  /** Per folder, each file's old name and the address its pages now use. */
  const renamed = new Map<string, { from: string; to: string }[]>();

  for (const op of writes) {
    const folder = folderOf(op.path);
    const name = baseOf(op.path);
    const extension = extensionOf(name);
    if (extension.toLowerCase() === "md") continue;
    const inPage = attachesFiles(folder) && !PICTURES.has(extension.toLowerCase());
    if (!inPage) {
      if (extension === extension.toLowerCase() || !PUBLISHED.has(extension.toLowerCase())) continue;
      const lower = freeName(`${name.slice(0, -extension.length)}${extension.toLowerCase()}`, takenIn(folder));
      takenIn(folder).add(lower);
      op.path = folder === "" ? lower : `${folder}/${lower}`;
      renamed.set(folder, [...(renamed.get(folder) ?? []), { from: name, to: lower }]);
      continue;
    }
    const attached = attachmentFor(folder, { path: name, bytes: op.content }, takenIn(`${folder}/${ATTACHMENTS}`));
    takenIn(`${folder}/${ATTACHMENTS}`).add(baseOf(attached.path));
    op.path = attached.path;
    op.content = attached.bytes;
    renamed.set(folder, [...(renamed.get(folder) ?? []), { from: name, to: attached.address }]);
  }

  if (renamed.size === 0) return out;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  for (const op of writes) {
    if (extensionOf(op.path).toLowerCase() !== "md") continue;
    const moves = renamed.get(folderOf(op.path));
    if (!moves) continue;
    const before = decoder.decode(op.content);
    const after = moves.reduce((page, move) => relinked(page, move.from, move.to), before);
    if (after !== before) op.content = encoder.encode(after);
  }
  return out;
}
