import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { NodeFileSystem } from "../../src/adapters/fs/node/node-fs.ts";
import { fileSystemContract } from "./file-system.contract.ts";

fileSystemContract("fs/memory", async (files) => new MemoryFileSystem(files));

const onDisk = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), "studio-fs-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
};
fileSystemContract("fs/node", async (files) => new NodeFileSystem(onDisk(files)));

it("fs/node refuses a path that leaves the course folder (STU-0006)", async () => {
  const fs = new NodeFileSystem(onDisk({ "course.md": "# C" }));
  await expect(fs.read("../outside.md")).rejects.toThrow("outside the course folder");
  await expect(fs.write("../../x", new Uint8Array())).rejects.toThrow("outside the course folder");
});

it("fs/memory notifies watchers on every change and stops after unsubscribe", async () => {
  const fs = new MemoryFileSystem({ "a.md": "a" });
  let calls = 0;
  const stop = fs.watch(() => calls++);
  await fs.write("b.md", new Uint8Array());
  await fs.move("b.md", "c.md");
  await fs.remove("c.md");
  stop();
  await fs.write("d.md", new Uint8Array());
  expect(calls).toBe(3);
});
