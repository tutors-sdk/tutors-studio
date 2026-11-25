import { describe, expect, it } from "vitest";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { DRIVE_TOKEN, googleDrive } from "../../src/adapters/registry/google-drive/google-drive.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { planComposedCourse } from "../../src/application/use-cases/compose-course.ts";
import { searchLibrary } from "../../src/application/use-cases/library.ts";
import { share } from "../../src/application/use-cases/share.ts";
import { driveFolder } from "../../src/domain/drive.ts";
import { fakeDrive } from "../support/fake-drive.ts";

const course = {
  "web/course.md": "# Web Development\n",
  "web/topic-01/topic.md": "# Week 1\n",
  "web/topic-01/lab-01/00.Setup.md": "# Setup\n",
  "web/topic-01/note-01/note.md": "# Reading\n",
};

function setup(token: string | null = "good", more: Partial<Parameters<typeof googleDrive>[0]> = {}) {
  const drive = fakeDrive();
  const secrets = new MemorySecrets();
  if (token !== null) void secrets.set(DRIVE_TOKEN, token);
  const adapter = googleDrive({ secrets, fetch: drive.fetch, ...more });
  return { drive, secrets, ...adapter };
}

describe("Google Drive (ADR 0064)", () => {
  it("lists and reads a library folder in Drive by path, and finds and checks the courses in it", async () => {
    const { drive, library } = setup();
    drive.put(drive.root, course);
    const folder = driveFolder(drive.root, "Teaching");
    expect((await library.list(folder, "web")).map((entry) => entry.name).sort()).toEqual(["course.md", "topic-01"]);
    expect(new TextDecoder().decode(await library.read(folder, "web/topic-01/topic.md"))).toBe("# Week 1\n");
    await expect(library.read(folder, "web/missing.md")).rejects.toThrow("not found in Google Drive");
    await expect(library.list(folder, "../elsewhere")).rejects.toThrow("outside the folder");
    const found = await searchLibrary({ library, rules: courseRules }, [folder]);
    expect(found.courses.map((c) => `${c.group} ${c.title}`)).toEqual(["ready Web Development"]);
  });

  it("shares into a registry in Drive, lists it in the library and composes from it", async () => {
    const { drive, library, registry } = setup();
    drive.put(drive.root, course);
    const teaching = driveFolder(drive.root, "Teaching");
    const shared = drive.add("Shared registry", drive.root, "application/vnd.google-apps.folder");
    const registryFolder = driveFolder(shared, "Shared registry");
    const deps = { library, registry, rules: courseRules, newId: () => "p", today: () => "2026-11-25" };
    const [web] = (await searchLibrary(deps, [teaching])).courses;
    const done = await share(deps, { course: web, item: "topic-01/lab-01", registry: registryFolder, publisher: "Leigh", licence: "CC-BY-4.0" });
    expect(done.ok && `${done.share.publisher}/${done.share.name}@${done.share.version}`).toBe("leigh/setup@1");
    expect(drive.paths(shared).filter((path) => !path.startsWith("items/"))).toEqual(["catalogue.json", "index/leigh/setup.json", "registry.json"]);
    const [entry] = (await searchLibrary(deps, [registryFolder])).courses;
    expect(entry.entry).toMatchObject({ publisher: "leigh", name: "setup", licence: "CC-BY-4.0" });
    const planned = await planComposedCourse(deps, { name: "Mixed", lecturer: "", weeks: 1 }, [{ course: entry, item: entry.items[0], week: 1 }]);
    expect(planned.ok).toBe(true);
  });

  it("writes only into a registry, and replaces a file that is already there", async () => {
    const { drive, registry, library } = setup();
    const folder = driveFolder(drive.root, "Plain");
    await expect(registry.write(folder, "items/x/a.md", new Uint8Array([1]))).rejects.toThrow("not a registry");
    await registry.write(folder, "registry.json", new TextEncoder().encode("{}"));
    await registry.write(folder, "catalogue.json", new TextEncoder().encode("one"));
    await registry.write(folder, "catalogue.json", new TextEncoder().encode("two"));
    expect(new TextDecoder().decode(await library.read(folder, "catalogue.json"))).toBe("two");
    expect(drive.paths()).toEqual(["catalogue.json", "registry.json"]);
    await registry.remove(folder, "catalogue.json");
    expect(drive.paths()).toEqual(["registry.json"]);
  });

  it("asks for a sign-in when there is none or Google refuses the token", async () => {
    const none = setup(null);
    await expect(none.library.list(driveFolder(none.drive.root, "x"), "")).rejects.toThrow("signed in to Google Drive");
    expect(await none.account.signedIn()).toBe(false);
    const stale = setup("stale");
    await expect(stale.library.list(driveFolder(stale.drive.root, "x"), "")).rejects.toThrow("sign in to Google Drive in Settings");
  });

  it("refreshes an expired access token with the refresh token and keeps the new one", async () => {
    const { drive, library, secrets } = setup(JSON.stringify({ access: "old", refresh: "refresh-1", expires: 1000 }), { clientId: "studio", now: () => 10_000 });
    drive.put(drive.root, course);
    expect((await library.list(driveFolder(drive.root, "x"), "")).map((e) => e.name)).toEqual(["web"]);
    expect(JSON.parse((await secrets.get(DRIVE_TOKEN))!)).toMatchObject({ access: "fresh", refresh: "refresh-1" });
  });

  it("signs in through the browser with PKCE and a loopback redirect, and refuses an answer for another sign-in", async () => {
    let state = "";
    const loopback = async () => ({ redirectUri: "http://127.0.0.1:5000", query: new Promise<string>((resolve) => setTimeout(() => resolve(`code=the-code&state=${state}`), 0)) });
    const { account, secrets } = setup(null, { clientId: "studio", loopback });
    const opened: string[] = [];
    const signed = await account.browserSignIn!((url) => {
      opened.push(url);
      state = new URL(url).searchParams.get("state")!;
    });
    expect(signed).toEqual({ ok: true });
    const asked = new URL(opened[0]).searchParams;
    expect([asked.get("code_challenge_method"), asked.get("redirect_uri"), asked.get("access_type")]).toEqual(["S256", "http://127.0.0.1:5000", "offline"]);
    expect(JSON.parse((await secrets.get(DRIVE_TOKEN))!)).toMatchObject({ access: "signed", refresh: "refresh-1" });

    const forged = setup(null, { clientId: "studio", loopback: async () => ({ redirectUri: "http://127.0.0.1:5000", query: Promise.resolve("code=the-code&state=other") }) });
    expect(await forged.account.browserSignIn!(() => {})).toMatchObject({ ok: false });
    expect(setup(null).account.browserSignIn).toBeUndefined();
  });

  it("names a folder from its id, and says when a link is to a file", async () => {
    const { drive, account } = setup();
    drive.put(drive.root, { "notes.md": "x" });
    expect(await account.folderName(drive.root)).toBe("Shared drive folder");
    const file = [...drive.items.values()].find((item) => item.name === "notes.md")!.id;
    await expect(account.folderName(file)).rejects.toThrow("not a folder");
  });
});
