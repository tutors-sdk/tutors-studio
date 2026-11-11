import { describe, expect, it } from "vitest";
import { attachesFiles, attachmentFor, attachmentName, placedForTutors, relinked, tutorsPublishes } from "../../src/domain/attachments.ts";
import type { FileOp } from "../../src/domain/plan.ts";
import { crc32, zipStored } from "../../src/domain/zip.ts";

const bytes = (text: string) => new TextEncoder().encode(text);
const write = (path: string, text = "x"): FileOp => ({ op: "write", path, content: bytes(text) });
const paths = (ops: FileOp[]) => ops.map((op) => (op.op === "write" ? op.path : op.to));
const textAt = (ops: FileOp[], path: string) => {
  const op = ops.find((candidate) => candidate.op === "write" && candidate.path === path);
  return op?.op === "write" ? new TextDecoder().decode(op.content) : undefined;
};

describe("zip", () => {
  it("records the standard CRC-32", () => expect(crc32(bytes("123456789"))).toBe(0xcbf43926));
  it("makes the same bytes from the same files", () => expect(zipStored([{ name: "a.docx", bytes: bytes("a") }])).toEqual(zipStored([{ name: "a.docx", bytes: bytes("a") }])));
  it("starts with a local header and ends with the end record", () => {
    const zip = zipStored([{ name: "a.docx", bytes: bytes("a") }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
  });
});

describe("attachments", () => {
  it("knows which folders hold pages that link files", () => {
    expect(["topic-01/note-01", "topic-01/lab-02-setup", "t/book-a", "side/panelnote"].map(attachesFiles)).toEqual([true, true, true, true]);
    expect(["topic-01", "topic-01/notebook-01", "topic-01/talk-01", "", "unit-1"].map(attachesFiles)).toEqual([false, false, false, false, false]);
  });
  it("names an attachment as Tutors and every web server read it", () => {
    expect(attachmentName("Brief Café.DOCX")).toBe("Brief-Cafe.docx");
    expect(attachmentName("  .pdf")).toBe("file.pdf");
  });
  it("reads published types case-blind", () => {
    expect(tutorsPublishes("Slides.PDF")).toBe(true);
    expect(tutorsPublishes("brief.docx")).toBe(false);
  });
  it("zips a type Tutors doesn't publish and keeps clear of taken names", () => {
    const attached = attachmentFor("t/note-01", { path: "My Brief.docx", bytes: bytes("doc") }, new Set(["My-Brief.docx.zip"]));
    expect(attached).toMatchObject({ path: "t/note-01/archives/My-Brief.docx-2.zip", address: "archives/My-Brief.docx-2.zip", label: "My Brief" });
  });
  it("points every form of a link at the new address", () => {
    const page = '[a](handout.pdf) [b](./handout.pdf) [c](<handout.pdf>) [d](handout.pdf "title") [e](old-handout.pdf) `handout.pdf`';
    expect(relinked(page, "handout.pdf", "archives/handout.pdf")).toBe(
      '[a](archives/handout.pdf) [b](archives/handout.pdf) [c](<archives/handout.pdf>) [d](archives/handout.pdf "title") [e](old-handout.pdf) `handout.pdf`',
    );
  });
});

describe("placedForTutors", () => {
  it("leaves a talk's slides as its card, with the extension lower-cased", () => {
    const ops = placedForTutors([write("t/talk-01/talk.md", "# Intro\n"), write("t/talk-01/Intro.PDF")]);
    expect(paths(ops)).toEqual(["t/talk-01/talk.md", "t/talk-01/Intro.pdf"]);
  });
  it("moves a lab's loose files into archives/ and keeps its pictures and subfolders", () => {
    const ops = placedForTutors([
      write("t/lab-01/01.Setup.md", "See [the sheet](sheet.pdf) and ![x](img/x.png)."),
      write("t/lab-01/sheet.pdf"),
      write("t/lab-01/main.png"),
      write("t/lab-01/img/x.png"),
      write("t/lab-01/code/app.py"),
    ]);
    expect(paths(ops)).toEqual(["t/lab-01/01.Setup.md", "t/lab-01/archives/sheet.pdf", "t/lab-01/main.png", "t/lab-01/img/x.png", "t/lab-01/code/app.py"]);
    expect(textAt(ops, "t/lab-01/01.Setup.md")).toBe("See [the sheet](archives/sheet.pdf) and ![x](img/x.png).");
  });
  it("keeps moves and working files as they are", () => {
    const ops: FileOp[] = [{ op: "move", from: "a", to: "b" }, write("t/files/marks.csv")];
    expect(placedForTutors(ops)).toEqual(ops);
  });
});
