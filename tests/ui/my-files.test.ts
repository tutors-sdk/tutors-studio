import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";
import MyFilesPanel from "../../src/ui/components/MyFiles.svelte";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryOwnFiles } from "../../src/adapters/own-files/memory/memory-own-files.ts";
import { createMyFiles } from "../../src/application/use-cases/my-files.ts";

describe("the My files panel", () => {
  it("lists the chosen folder, opens a folder in it, and adds an entry to the open week", async () => {
    const myFiles = createMyFiles(memoryOwnFiles({ "/teaching": new MemoryFileSystem({ "Lecture 2.pdf": "%PDF", "Lab/01 Setup.md": "# Setup\n" }) }));
    const onAdd = vi.fn();
    render(MyFilesPanel, { myFiles, choose: async () => "/teaching", week: { path: "topic-01", title: "Week 1" }, onAdd });
    await fireEvent.click(screen.getByRole("button", { name: "Choose your folder…" }));
    await fireEvent.click(await screen.findByRole("button", { name: "Add Lecture 2.pdf to Week 1" }));
    expect(onAdd).toHaveBeenCalledWith("topic-01", { name: "Lecture 2.pdf", path: "Lecture 2.pdf", kind: "file" });
    await fireEvent.click(screen.getByRole("button", { name: "Open the folder Lab" }));
    expect(await screen.findByText("01 Setup.md")).toBeTruthy();
  });
});
