import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import Library from "../../src/ui/components/Library.svelte";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { memoryLibrary } from "../../src/adapters/library/memory/memory-library.ts";
import { MemorySettings } from "../../src/adapters/settings/memory/memory-settings.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { createLibrary } from "../../src/application/use-cases/library.ts";
import { planComposedCourse, type ComposeAnswers } from "../../src/application/use-cases/compose-course.ts";
import type { ComposePick } from "../../src/domain/compose.ts";
import { memoryRegistry } from "../../src/adapters/registry/memory/memory-registry.ts";
import { planShare, share, type ShareRequest } from "../../src/application/use-cases/share.ts";
import { googleDrive } from "../../src/adapters/registry/google-drive/google-drive.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { offeredDrive } from "../../src/application/use-cases/drive.ts";
import { routedLibrary } from "../../src/application/use-cases/library.ts";
import { fakeDrive } from "../support/fake-drive.ts";

const ready = { "web/course.md": "# Web Development\n", "web/topic-01/topic.md": "# Week 1\n", "web/topic-01/note-01/note.md": "# Reading\n" };
const broken = { "old/course.md": "# Old Module\n", "old/topic-01/talk-01/talk.md": "# Loose\n" };

const shared = new MemoryFileSystem({});
const port = memoryLibrary({ "/teaching": new MemoryFileSystem({ ...ready, ...broken }), "/more": new MemoryFileSystem({}), "/shared": shared });
const shareDeps = { library: port, registry: memoryRegistry({ "/shared": shared }), newId: () => "s", today: () => "2026-11-25" };
const screenOf = (folders: string[], create = vi.fn()) => ({
  shelf: createLibrary({ library: port, rules: courseRules, settings: new MemorySettings({ libraryFolders: folders }) }),
  preview: async (answers: ComposeAnswers, picks: ComposePick[]) => {
    const planned = await planComposedCourse({ library: port, rules: courseRules, newId: () => "p", today: () => "2026-11-25" }, answers, picks);
    return planned.ok ? { ok: true as const, summary: planned.compose.plan.summary, notes: planned.compose.notes } : planned;
  },
  create,
  share: {
    choose: async () => "/shared",
    preview: async (request: ShareRequest) => {
      const planned = await planShare(shareDeps, request);
      return planned.ok ? { ok: true as const, summary: planned.share.plan.summary, notes: planned.share.notes } : planned;
    },
    apply: async (request: ShareRequest) => {
      const done = await share(shareDeps, request);
      return done.ok ? { shared: `${done.share.publisher}/${done.share.name} version ${done.share.version}` } : { reason: done.reason };
    },
  },
});
describe("the library screen", () => {
  it("lists the ready courses and those that need fixing, and opens one by its folder", async () => {
    const onOpen = vi.fn();
    render(Library, { library: screenOf(["/teaching"]), onOpen, onClose: vi.fn() });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Needs fixing (1)" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Open Web Development" }));
    expect(onOpen).toHaveBeenCalledWith("/teaching/web");
  });

  it("adds a folder the lecturer chooses and takes one out", async () => {
    const choose = vi.fn().mockResolvedValue("/teaching");
    render(Library, { library: screenOf(["/more"]), choose, onOpen: vi.fn(), onClose: vi.fn() });
    await waitFor(() => expect(screen.getByText(/There are no Tutors courses in these folders yet/)).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Add a folder" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Take teaching out of your library" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Ready to use (1)" })).toBeNull());
  });

  it("picks a week, shows the plan that says it is a copy, and opens the course it makes", async () => {
    const opened = { name: "Mixed" };
    const create = vi.fn().mockResolvedValue(opened);
    const onOpen = vi.fn();
    render(Library, { library: screenOf(["/teaching"], create), onOpen, onClose: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Pick from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "Pick Week 1 from Web Development" }));
    expect(screen.getByText("Picked")).toBeTruthy();
    await fireEvent.input(screen.getByLabelText("Course name"), { target: { value: "Mixed" } });
    await fireEvent.click(screen.getByRole("button", { name: "See the plan" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Before anything changes" })).toBeTruthy());
    expect(screen.getByText(/Studio copies each item into your new course/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Create course" }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(opened));
    expect(create.mock.calls[0][0]).toEqual({ name: "Mixed", lecturer: "", weeks: 1 });
  });

  it("says what to change before there is a plan, and takes a pick out", async () => {
    render(Library, { library: screenOf(["/teaching"]), onOpen: vi.fn(), onClose: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Pick from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "Pick Reading from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "See the plan" }));
    await waitFor(() => expect(screen.getByText("Give the course a name with at least one letter or number.")).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Take Reading out" }));
    expect(screen.queryByRole("heading", { name: "Your new course" })).toBeNull();
  });

  it("shares a course into a registry only with a licence, then lists what it shared", async () => {
    render(Library, { library: screenOf(["/teaching"]), onOpen: vi.fn(), onClose: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Share from Web Development" }));
    await fireEvent.click(screen.getByRole("button", { name: "Choose a folder" }));
    await fireEvent.input(screen.getByLabelText("Publisher"), { target: { value: "Leigh" } });
    await fireEvent.click(screen.getByRole("button", { name: "See the plan" }));
    await waitFor(() => expect(screen.getByText(/Studio shares nothing without one/)).toBeTruthy());
    await fireEvent.input(screen.getByLabelText("Licence"), { target: { value: "CC-BY-4.0" } });
    await fireEvent.click(screen.getByRole("button", { name: "See the plan" }));
    await waitFor(() => expect(screen.getByText(/Share Web Development to shared as leigh\/web-development version 1, under CC-BY-4.0/)).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(screen.getByText("Shared as leigh/web-development version 1.")).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/version 1, CC-BY-4.0/)).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Ready to use (2)" })).toBeTruthy();
  });

  it("signs in to Google through the browser, then adds a Drive folder by its link and finds the course in it", async () => {
    const drive = fakeDrive();
    drive.put(drive.root, ready);
    // Google's page answers the loopback with the state Studio sent, as a lecturer's sign-in would.
    let answer: (query: string) => void = () => {};
    const loopback = async () => ({ redirectUri: "http://127.0.0.1:5000", query: new Promise<string>((resolve) => (answer = resolve)) });
    const open = vi.fn((url: string) => answer(`code=the-code&state=${new URL(url).searchParams.get("state")}`));
    const google = googleDrive({ secrets: new MemorySecrets(), fetch: drive.fetch, clientId: "studio", loopback });
    const library = routedLibrary(port, google.library);
    const screenWithDrive = {
      ...screenOf([]),
      shelf: createLibrary({ library, rules: courseRules, settings: new MemorySettings({ libraryFolders: [] }) }),
      drive: offeredDrive({ account: google.account, open }),
    };
    render(Library, { library: screenWithDrive, onOpen: vi.fn(), onClose: vi.fn() });
    await fireEvent.click(await screen.findByRole("button", { name: "Add a Google Drive folder" }));
    expect(screen.queryByLabelText(/token/i)).toBeNull();
    await fireEvent.click(await screen.findByRole("button", { name: "Sign in to Google" }));
    await fireEvent.input(await screen.findByLabelText("Folder link"), { target: { value: "my folder" } });
    await fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.getByText(/Paste the link of a Google Drive folder/)).toBeTruthy());
    await fireEvent.input(screen.getByLabelText("Folder link"), { target: { value: `https://drive.google.com/drive/folders/${drive.root}?usp=sharing` } });
    await fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ready to use (1)" })).toBeTruthy());
    expect(screen.getByText("Google Drive: Shared drive folder")).toBeTruthy();
    expect(open).toHaveBeenCalledOnce();
  });

  it("offers no Google Drive folders in a copy of Studio without its own Google client", async () => {
    const google = googleDrive({ secrets: new MemorySecrets(), fetch: fakeDrive().fetch });
    render(Library, { library: { ...screenOf([]), drive: offeredDrive({ account: google.account, open: vi.fn() }) }, onOpen: vi.fn(), onClose: vi.fn() });
    await screen.findByRole("heading", { name: "Your library" });
    expect(screen.queryByRole("button", { name: "Add a Google Drive folder" })).toBeNull();
  });
});
