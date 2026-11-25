import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { nodeCourseFolder } from "../../src/adapters/fs/node/node-fs.ts";
import { nodeLibrary } from "../../src/adapters/library/node/node-library.ts";
import { DRIVE_TOKEN, googleDrive } from "../../src/adapters/registry/google-drive/google-drive.ts";
import { nodeRegistry } from "../../src/adapters/registry/node/node-registry.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { runCompose, runHeadlessNew, runLibrary, runShare } from "../../src/adapters/cli/headless/headless.ts";
import { createDrive, offeredDrive } from "../../src/application/use-cases/drive.ts";
import { routedLibrary } from "../../src/application/use-cases/library.ts";
import { routedRegistry } from "../../src/application/use-cases/share.ts";
import { driveFolder } from "../../src/domain/drive.ts";
import { fakeDrive } from "../../tests/support/fake-drive.ts";

const feature = await loadFeature("spec/features/google-drive.feature");

/** Every file under a folder on disk, by path, as text. */
const filesOf = (root: string, dir = ""): Record<string, string> =>
  Object.assign(
    {},
    ...readdirSync(join(root, dir), { withFileTypes: true }).map((entry) => {
      const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
      return entry.isDirectory() ? filesOf(root, path) : { [path]: readFileSync(join(root, path), "utf8") };
    }),
  );

describeFeature(feature, ({ Background, Rule, AfterEachScenario }) => {
  let drive: ReturnType<typeof fakeDrive>;
  let secrets: MemorySecrets;
  let folders: Record<string, string>;
  let parent: string;
  let lines: string[];
  let said: string;
  let refused: string;
  let n = 0;
  const google = () => googleDrive({ secrets, fetch: drive.fetch });
  const deps = () => {
    const adapter = google();
    return {
      library: routedLibrary(nodeLibrary, adapter.library),
      registry: routedRegistry(nodeRegistry, adapter.registry),
      rules: courseRules,
      newId: () => `plan-${++n}`,
      today: () => "2026-11-25",
    };
  };
  const print = (line: string) => lines.push(line);
  const lists = async (_: unknown, name: string) => {
    lines = [];
    await runLibrary(deps(), [folders[name]], print);
  };
  const printed = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);
  const printedSaying = (_: unknown, words: string) =>
    expect(
      lines.some((line) => line.includes(words)),
      lines.join("\n"),
    ).toBe(true);

  AfterEachScenario(() => rmSync(parent, { recursive: true, force: true }));

  Background(({ Given }) => {
    Given("a Google Drive folder {string} holding a new course {string} at {string}", async (_, folder: string, name: string, at: string) => {
      drive = fakeDrive();
      secrets = new MemorySecrets({ [DRIVE_TOKEN]: "good" });
      parent = mkdtempSync(join(tmpdir(), "studio-drive-made-"));
      lines = [];
      const scratch = mkdtempSync(join(tmpdir(), "studio-drive-new-"));
      await runHeadlessNew(
        (p) => ({ rules: courseRules, newId: () => `plan-${++n}`, makeFolder: nodeCourseFolder(p) }),
        [scratch, "--name", name, "--weeks", "2"],
        () => {},
      );
      const made = readdirSync(scratch)[0];
      const id = drive.add(folder, drive.root, "application/vnd.google-apps.folder");
      drive.put(id, Object.fromEntries(Object.entries(filesOf(join(scratch, made))).map(([path, text]) => [`${at}/${path}`, text])));
      rmSync(scratch, { recursive: true, force: true });
      folders = { [folder]: driveFolder(id, folder) };
    });
  });

  Rule(
    "When a lecturer adds a Google Drive folder to their library by its link, the Studio shall search it for courses and registries as it searches a folder on this computer.",
    ({ RuleScenario }) => {
      RuleScenario("Courses in a Drive folder", ({ When, Then }) => {
        When("the lecturer lists the library {string} in Google Drive", lists);
        Then("the command shall print {string}", printed);
      });
    },
  );

  Rule("The Studio shall share into, and borrow from, a registry in a Google Drive folder as it does a registry folder on this computer.", ({ RuleScenario }) => {
    RuleScenario("Sharing a lab into a Drive registry and borrowing it", ({ Given, When, Then }) => {
      Given("an empty Google Drive folder {string}", (_, name: string) => {
        folders[name] = driveFolder(drive.add(name, drive.root, "application/vnd.google-apps.folder"), name);
      });
      When(
        "the lecturer shares the item {string} of {string} into {string} as {string} under {string}",
        async (_, item: string, course: string, into: string, publisher: string, licence: string) => {
          lines = [];
          await runShare(deps(), [folders.Teaching, "--course", course, "--item", item, "--to", folders[into], "--publisher", publisher, "--licence", licence], print);
        },
      );
      Then("the command shall print {string}", printed);
      When("the lecturer composes {string} from {string} in {string}", async (_, name: string, pick: string, from: string) => {
        lines = [];
        await runCompose({ ...deps(), makeFolder: nodeCourseFolder }, [parent, "--name", name, "--from", folders[from], "--pick", pick], print);
      });
      Then("the command shall then print {string}", printed);
    });
  });

  Rule("If the Studio is not signed in to Google Drive, or Google refuses its sign-in, then the Studio shall read nothing from Drive and say to sign in.", ({ RuleScenario }) => {
    RuleScenario("Not signed in", ({ Given, When, Then }) => {
      Given("Studio is not signed in to Google Drive", () => secrets.set(DRIVE_TOKEN, ""));
      When("the lecturer lists the library {string} in Google Drive", lists);
      Then("the command shall print a line saying {string}", printedSaying);
    });
    RuleScenario("A token Google no longer accepts", ({ Given, When, Then }) => {
      Given("Studio's Google sign-in has been withdrawn", () => secrets.set(DRIVE_TOKEN, "withdrawn"));
      When("the lecturer lists the library {string} in Google Drive", lists);
      Then("the command shall print a line saying {string}", printedSaying);
    });
  });

  Rule("If what a lecturer pastes is not the link of a Google Drive folder, then the Studio shall add nothing and say how to copy one.", ({ RuleScenario }) => {
    RuleScenario("Something that isn't a folder link", ({ When, Then }) => {
      When("the lecturer adds the Google Drive folder {string}", async (_, link: string) => {
        const found = await createDrive({ account: google().account, open: () => {} }).folder(link);
        said = "reason" in found ? found.reason : found.folder;
      });
      Then("Studio shall say {string}", (_, words: string) => expect(said).toBe(words));
    });
  });

  Rule("The Studio shall write in Google Drive only into a folder that is a registry, or the registry.json that starts one.", ({ RuleScenario }) => {
    RuleScenario("A Drive folder that isn't a registry", ({ When, Then }) => {
      When("Studio writes {string} into {string} in Google Drive", async (_, path: string, name: string) => {
        refused = await deps()
          .registry.write(folders[name], path, new TextEncoder().encode("# Lab"))
          .then(() => "")
          .catch((error: Error) => error.message);
      });
      Then("the write shall be refused as {string}", (_, words: string) => expect(refused).toContain(words));
    });
  });

  Rule("While the Studio has no Google sign-in of its own, the Studio shall not offer a lecturer Google Drive folders.", ({ RuleScenario }) => {
    let offered: ReturnType<typeof offeredDrive>;
    RuleScenario("A copy of Studio without Google's client", ({ Given, Then }) => {
      Given("a copy of Studio built without a Google client", () => {
        offered = offeredDrive({ account: google().account, open: () => {} });
      });
      Then("Studio shall not offer Google Drive folders", () => expect(offered).toBeUndefined());
    });
    RuleScenario("A copy of Studio with Google's client", ({ Given, Then }) => {
      Given("a copy of Studio built with a Google client", () => {
        const loopback = async () => ({ redirectUri: "http://127.0.0.1:5000", query: Promise.resolve("") });
        offered = offeredDrive({ account: googleDrive({ secrets, fetch: drive.fetch, clientId: "studio", loopback }).account, open: () => {} });
      });
      Then("Studio shall offer Google Drive folders with a sign-in through Google", () => expect(offered?.signIn).toBeTypeOf("function"));
    });
  });
});
