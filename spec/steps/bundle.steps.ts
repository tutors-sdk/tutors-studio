import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import {
  bumpBundle,
  bundleFromRelease,
  installReader,
  nodeProblem,
  parseReleaseManifest,
  type TutorsReleaseManifest,
  checkoutAtPin,
  fetchParts,
  parseBundle,
  pinsFor,
  READER_FOLDER,
  READER_STAMP,
  readBundle,
  readerState,
  sha256,
  stalePins,
  type Bundle,
} from "../../scripts/bundle.ts";
import { readerNotice } from "../../scripts/tauri.ts";
import { TUTORS_RELEASE } from "../../src/domain/bundle.ts";
import { TUTORS_GENERATOR, WEBSITE_GENERATOR } from "../../src/domain/publish.ts";
import { createUpdates } from "../../src/application/use-cases/updates.ts";
import { noUpdates } from "../../src/adapters/updates/none/no-updates.ts";
import type { UpdatesPort } from "../../src/application/ports/updates.ts";

const feature = await loadFeature("spec/features/bundle.feature");
const text = (words: string) => new TextEncoder().encode(words);

describeFeature(feature, ({ Rule, AfterEachScenario }) => {
  let bundle: Bundle;
  let root = "";
  let stale: string[] = [];
  let refusal = "";
  let answer = "";
  let failure = "";
  let said = "";

  AfterEachScenario(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = "";
    failure = "";
  });

  const temporary = () => (root ||= mkdtempSync(join(tmpdir(), "studio-bundle-")));

  Rule("The Studio shall build and check courses with the Tutors generator, tutors-lite and Deno that tutors-bundle.json names, and no other.", ({ RuleScenario }) => {
    RuleScenario("The pins are the manifest's", ({ Given, Then, And }) => {
      Given("the manifest in the repository", () => {
        bundle = readBundle();
      });
      Then("the pins written from it are the ones in the repository", () => expect(stalePins()).toEqual([]));
      And("Studio builds with {string} and the manifest's generator", (_, scheme: string) => expect(TUTORS_GENERATOR).toBe(`${scheme}${bundle.generator}`));
      And("Studio builds websites with {string} and the manifest's tutors-lite", (_, scheme: string) => expect(WEBSITE_GENERATOR).toBe(`${scheme}${bundle.website}`));
    });
    RuleScenario("A changed manifest makes the pins stale", ({ Given, When, Then }) => {
      Given("a copy of the repository whose manifest names generator {string}", (_, generator: string) => {
        const dir = temporary();
        for (const [path, contents] of Object.entries(pinsFor(readBundle()))) {
          mkdirSync(join(dir, path, ".."), { recursive: true });
          writeFileSync(join(dir, path), contents);
        }
        writeFileSync(join(dir, "tutors-bundle.json"), JSON.stringify({ ...readBundle(), generator }));
      });
      When("the pins are checked", () => {
        stale = stalePins(root);
      });
      Then("the check names {string}, {string} and {string}", (_, first: string, second: string, third: string) => expect(stale).toEqual([first, second, third]));
    });
    RuleScenario("A manifest that names no version is refused", ({ Given, When, Then }) => {
      let manifest = "";
      Given("a manifest whose generator is {string}", (_, generator: string) => {
        manifest = JSON.stringify({ ...readBundle(), generator });
      });
      When("it is read", () => {
        try {
          parseBundle(manifest);
        } catch (error) {
          refusal = (error as Error).message;
        }
      });
      Then("it is refused with {string}", (_, words: string) => expect(refusal).toContain(words));
    });
  });

  Rule(
    "If a part of the bundle downloaded for a Studio build does not have the SHA-256 that tutors-bundle.json gives for it, then the Studio shall fail the build and name the part.",
    ({ RuleScenario }) => {
      const pinned = (_: unknown, name: string, contents: string) => {
        bundle = { ...readBundle(), parts: [{ name, url: `https://example.test/${name}.tar.gz`, sha256: sha256(text(contents)), file: `bundle/${name}.tar.gz` }] };
      };
      const answers = (_: unknown, contents: string) => {
        answer = contents;
      };
      const fetched = async () => {
        try {
          await fetchParts(bundle, temporary(), async () => new Response(text(answer)));
        } catch (error) {
          failure = (error as Error).message;
        }
      };
      RuleScenario("A part that changed after it was pinned", ({ Given, And, When, Then }) => {
        Given("a manifest with a part {string} pinned to the SHA-256 of {string}", pinned);
        And("the download now answers {string}", answers);
        When("the parts are fetched", fetched);
        Then("the build fails naming {string}", (_, name: string) => expect(failure).toMatch(new RegExp(`^  ${name} \\(`, "m")));
        And("no file is written for it", () => expect(existsSync(join(root, bundle.parts[0].file))).toBe(false));
      });
      RuleScenario("The part that was pinned", ({ Given, And, When, Then }) => {
        Given("a manifest with a part {string} pinned to the SHA-256 of {string}", pinned);
        And("the download now answers {string}", answers);
        When("the parts are fetched", fetched);
        Then("the part's file holds {string}", (_, contents: string) => {
          expect(failure).toBe("");
          expect(readFileSync(join(root, bundle.parts[0].file), "utf8")).toBe(contents);
        });
      });
    },
  );

  Rule("The Studio shall say in Settings which Tutors release is inside it.", ({ RuleScenario }) => {
    RuleScenario("Studio 0.1.0 with Tutors 17.1.0", ({ Given, When, Then }) => {
      Given("Studio 0.1.0 built from a manifest naming Tutors {string}", (_, release: string) => expect(TUTORS_RELEASE).toBe(release));
      When("the lecturer opens Settings", async () => {
        said = await createUpdates(noUpdates("0.1.0")).inside();
      });
      Then("Studio shall say {string}", (_, words: string) => expect(said).toBe(words));
    });
  });

  Rule("The Studio's Tutors tools shall be compiled from a tutors-mono-repo checkout at the commit that tutors-bundle.json names, and from no other.", ({ RuleScenario }) => {
    RuleScenario("The tools program takes Tutors from the checkout", ({ Given, Then, And }) => {
      Given("the manifest in the repository", () => {
        bundle = readBundle();
      });
      Then("the tools program imports {string} and {string}, which the checkout's workspace answers", (_, generator: string, website: string) => {
        const tools = readFileSync("tools/main.ts", "utf8");
        expect(tools).toContain(`await import(${JSON.stringify(generator)})`);
        expect(tools).toContain(`await import(${JSON.stringify(website)})`);
        expect(tools).not.toContain(`import("jsr:`);
      });
      And("the tools program's version names the manifest's commit", () =>
        expect(readFileSync("tools/main.ts", "utf8")).toContain(`from ${bundle.reader.repository}@${bundle.reader.commit.slice(0, 7)}`),
      );
    });
    RuleScenario("A checkout at another commit is refused", ({ Given, When, Then }) => {
      Given("a tutors-mono-repo checkout at a commit the manifest does not name", () => {
        const dir = temporary();
        const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=Studio", "-c", "user.email=studio@example.invalid", ...args], { cwd: dir });
        git("init", "--quiet");
        writeFileSync(join(dir, "deno.json"), "{}");
        git("add", ".");
        git("commit", "--quiet", "-m", "Not the pinned commit");
      });
      When("the tools are compiled from it", () => {
        try {
          checkoutAtPin(root, readBundle(), "tools");
        } catch (error) {
          refusal = (error as Error).message;
        }
      });
      Then("it is refused with {string}", (_, words: string) => expect(refusal).toContain(words));
    });
  });

  Rule(
    "When tutors-mono-repo publishes a release newer than the one tutors-bundle.json names, the manifest bot shall open a pull request that moves the manifest and its pins to that release.",
    ({ RuleScenario }) => {
      let moved: Bundle | null = null;
      const names = (_: unknown, version: string) => {
        bundle = readBundle();
        expect(bundle.tutors).toBe(version);
      };
      const releases = (_: unknown, tag: string, commit: string, version: string) =>
        void (moved = bumpBundle(bundle, { tutors: tag, commit, generator: version, website: version }));
      RuleScenario("Tutors 17.2.0 is released", ({ Given, When, Then, And }) => {
        Given("the manifest in the repository names Tutors {string}", names);
        When("tutors-mono-repo releases {string} at commit {string} with the generator and tutors-lite at {string}", releases);
        Then("the manifest names Tutors {string}, built from that commit", (_, version: string) => {
          expect(moved?.tutors).toBe(version);
          expect(moved?.reader.commit).toBe("a".repeat(40));
        });
        And("the pins name {string} and {string}", (_, generator: string, website: string) => {
          const pins = pinsFor(moved!)["src/domain/bundle.ts"];
          expect(pins).toContain(generator);
          expect(pins).toContain(website);
        });
      });
      RuleScenario("Nothing newer", ({ Given, When, Then }) => {
        Given("the manifest in the repository names Tutors {string}", names);
        When("tutors-mono-repo releases {string} at commit {string} with the generator and tutors-lite at {string}", releases);
        Then("the manifest is left as it is", () => expect(moved).toBeNull());
      });
    },
  );

  Rule("While tutors.dev runs a newer Tutors release than the one inside Studio, the Studio shall say so beside the preview.", ({ RuleScenario }) => {
    let production: string | null = null;
    const ask = () => {
      const port: UpdatesPort = { ...noUpdates("0.1.0"), productionTutors: async () => production };
      return createUpdates(port).productionAhead();
    };
    const inside = (_: unknown, version: string) => expect(TUTORS_RELEASE).toBe(version);
    RuleScenario("Production is ahead", ({ Given, When, Then }) => {
      Given("Studio with Tutors {string} inside", inside);
      When("tutors.dev answers that it runs Tutors {string}", (_, version: string) => void (production = version));
      Then("Studio says {string}", async (_, words: string) => expect(await ask()).toBe(words));
    });
    RuleScenario("Production is the same release", ({ Given, When, Then }) => {
      Given("Studio with Tutors {string} inside", inside);
      When("tutors.dev answers that it runs Tutors {string}", (_, version: string) => void (production = version));
      Then("Studio says nothing about it", async () => expect(await ask()).toBeNull());
    });
    RuleScenario("Production can't be asked", ({ Given, When, Then }) => {
      Given("Studio with Tutors {string} inside", inside);
      When("tutors.dev can't be asked", () => void (production = null));
      Then("Studio says nothing about it", async () => expect(await ask()).toBeNull());
    });
  });

  Rule(
    "When a developer runs `pnpm tauri dev` and the Tutors reader inside Studio is missing or built from another commit than tutors-bundle.json pins, the build shall say so and offer to build it.",
    ({ RuleScenario }) => {
      /** A checkout with this repository's manifest, and the reader built from `commit` (null: not built). */
      const checkout = (commit: string | null, stamped = true) => {
        root = mkdtempSync(join(tmpdir(), "studio-dev-"));
        writeFileSync(join(root, "tutors-bundle.json"), readFileSync("tutors-bundle.json"));
        if (commit === null) return;
        mkdirSync(join(root, READER_FOLDER), { recursive: true });
        writeFileSync(join(root, READER_FOLDER, "200.html"), "<html></html>");
        if (stamped) writeFileSync(join(root, READER_FOLDER, READER_STAMP), `${commit}\n`);
      };
      const says = (_: unknown, words: string) => expect(readerNotice(readerState(root))).toContain(words);
      RuleScenario("No reader built yet", ({ Given, Then }) => {
        Given("a Studio checkout with no reader built", () => checkout(null));
        Then("the dev command shall say {string}", says);
      });
      RuleScenario("A reader built from another commit", ({ Given, Then }) => {
        Given("a Studio checkout whose reader was built from another commit", () => checkout("0".repeat(40)));
        Then("the dev command shall say {string}", says);
      });
      RuleScenario("The reader at the pinned commit", ({ Given, Then }) => {
        Given("a Studio checkout whose reader was built at the pinned commit", () => checkout(readBundle().reader.commit));
        Then("the dev command shall say nothing about the reader", () => expect(readerNotice(readerState(root))).toBeNull());
      });
    },
  );
  /** A Tutors release's tutors-release.json, with its reader file's SHA-256 (ADR 0069). */
  const releaseOf = (tutors: string, readerSha = "c".repeat(64)): TutorsReleaseManifest => ({
    schema: 1,
    tutors,
    tag: `v${tutors}`,
    commit: "d".repeat(40),
    repository: "tutors-sdk/tutors-mono-repo",
    prerelease: tutors.includes("-"),
    generator: "@tutors/tutors@5.4.0",
    website: "@tutors/tutors-lite@5.4.0",
    deno: "2.9.7",
    parts: [
      {
        name: "reader",
        asset: `tutors-reader-static-${tutors}.tar.gz`,
        url: `https://github.com/tutors-sdk/tutors-mono-repo/releases/download/v${tutors}/tutors-reader-static-${tutors}.tar.gz`,
        sha256: readerSha,
      },
      {
        name: "tutors-x86_64-unknown-linux-gnu",
        asset: "tutors-x86_64-unknown-linux-gnu",
        target: "x86_64-unknown-linux-gnu",
        url: "https://github.com/tutors-sdk/tutors-mono-repo/releases/download/x/tutors-x86_64-unknown-linux-gnu",
        sha256: "e".repeat(64),
      },
    ],
  });

  Rule(
    "When a Tutors release names itself in a tutors-release.json, the manifest bot shall move tutors-bundle.json to that release's versions, its commit, and its reader file with that file's SHA-256.",
    ({ RuleScenario }) => {
      let moved: Bundle | null = null;
      const names = (_: unknown, version: string) => {
        bundle = readBundle();
        expect(bundle.tutors).toBe(version);
      };
      RuleScenario("Tutors 17.2.0 carries its reader", ({ Given, When, Then, And }) => {
        Given("the manifest in the repository names Tutors {string}", names);
        When("Tutors {string} is released with a tutors-release.json naming its reader file {string}", (_, tutors: string) => {
          moved = bundleFromRelease(bundle, parseReleaseManifest(JSON.stringify(releaseOf(tutors))));
        });
        Then("the manifest names Tutors {string}, its packages, its Deno and its commit", (_, version: string) => {
          expect(moved).toMatchObject({
            tutors: version,
            generator: "@tutors/tutors@5.4.0",
            website: "@tutors/tutors-lite@5.4.0",
            deno: "2.9.7",
            reader: { commit: "d".repeat(40) },
          });
        });
        And("the manifest's reader part is that file, with its SHA-256", () => {
          expect(moved?.parts).toEqual([
            { name: "reader", url: releaseOf("17.2.0").parts[0].url, sha256: "c".repeat(64), file: ".cache/parts/tutors-reader-static-17.2.0.tar.gz" },
          ]);
        });
      });
      RuleScenario("A prerelease is left for testers", ({ Given, When, Then }) => {
        Given("the manifest in the repository names Tutors {string}", names);
        When("a candidate {string} is released with a tutors-release.json", (_, tutors: string) => void (moved = bundleFromRelease(bundle, releaseOf(tutors))));
        Then("the manifest is left as it is", () => expect(moved).toBeNull());
      });
      RuleScenario("A release manifest in a shape Studio doesn't read", ({ When, Then }) => {
        When("a tutors-release.json of schema 2 is read", () => {
          try {
            parseReleaseManifest(JSON.stringify({ ...releaseOf("17.2.0"), schema: 2 }));
          } catch (error) {
            refusal = (error as Error).message;
          }
        });
        Then("it is refused with {string}", (_, words: string) => expect(refusal).toContain(words));
      });
    },
  );

  /** A Studio checkout whose manifest names a release's reader file, served by `get`; the reader there before is "old". */
  let served: Uint8Array;
  const releaseCheckout = () => {
    root = mkdtempSync(join(tmpdir(), "studio-release-"));
    const built = join(root, "built", "reader");
    mkdirSync(join(built, "_app"), { recursive: true });
    writeFileSync(join(built, "200.html"), "<html>released reader</html>");
    writeFileSync(join(built, "_app", "start.js"), "export {}");
    execFileSync("tar", ["-czf", "../reader.tar.gz", "reader"], { cwd: join(root, "built") });
    served = new Uint8Array(readFileSync(join(root, "reader.tar.gz")));
    const release = releaseOf("99.0.0", sha256(served));
    bundle = bundleFromRelease(readBundle(), release)!;
    mkdirSync(join(root, READER_FOLDER), { recursive: true });
    writeFileSync(join(root, READER_FOLDER, "200.html"), "old");
  };
  const install = async () => {
    try {
      await installReader(bundle, root, (async () => new Response(new Blob([served as Uint8Array<ArrayBuffer>]))) as unknown as typeof fetch);
    } catch (error) {
      refusal = (error as Error).message;
    }
  };

  Rule(
    "While tutors-bundle.json names a reader file from a Tutors release, the Studio build shall install the reader inside Studio from that file, building nothing.",
    ({ RuleScenario }) => {
      RuleScenario("The reader comes from the release", ({ Given, When, Then }) => {
        Given("a Studio checkout whose manifest names a Tutors release's reader file", releaseCheckout);
        When("the reader is installed", install);
        Then("the reader inside Studio is that file's reader, stamped with the release's commit", () => {
          expect(readFileSync(join(root, READER_FOLDER, "200.html"), "utf8")).toBe("<html>released reader</html>");
          expect(readFileSync(join(root, READER_FOLDER, "_app", "start.js"), "utf8")).toBe("export {}");
          expect(readFileSync(join(root, READER_FOLDER, READER_STAMP), "utf8").trim()).toBe("d".repeat(40));
        });
      });
    },
  );

  Rule(
    "If the reader file of a Tutors release does not have the SHA-256 that tutors-bundle.json gives for it, then the Studio build shall refuse it, name it, and leave the reader inside Studio as it was.",
    ({ RuleScenario }) => {
      RuleScenario("A reader file that was changed", ({ Given, When, Then, And }) => {
        Given("a Studio checkout whose manifest names a Tutors release's reader file", releaseCheckout);
        And("the file served is not the one released", () => void (served = text("something else")));
        When("the reader is installed", install);
        Then("it is refused with {string}", (_, words: string) => expect(refusal).toContain(words));
        And("the reader inside Studio is as it was", () => expect(readFileSync(join(root, READER_FOLDER, "200.html"), "utf8")).toBe("old"));
      });
    },
  );
  Rule(
    "If this computer's Node is older than the Node a tutors-mono-repo checkout names in its package.json, then `pnpm bundle reader` shall say which Node Tutors needs and which this computer has, and build nothing.",
    ({ RuleScenario }) => {
      let problem: string | null = null;
      const needs = (_: unknown, wanted: string) => {
        root = mkdtempSync(join(tmpdir(), "studio-node-"));
        writeFileSync(join(root, "package.json"), JSON.stringify({ name: "tutors-mono-repo", engines: { node: wanted } }));
      };
      const builtWith = (_: unknown, node: string) => void (problem = nodeProblem(root, node));
      RuleScenario("Node 24 where Tutors needs Node 26.13", ({ Given, When, Then }) => {
        Given("a tutors-mono-repo checkout that needs Node {string}", needs);
        When("the reader is built on a computer with Node {string}", builtWith);
        Then("the build says {string}", (_, words: string) => expect(problem).toContain(words));
      });
      RuleScenario("Node new enough", ({ Given, When, Then }) => {
        Given("a tutors-mono-repo checkout that needs Node {string}", needs);
        When("the reader is built on a computer with Node {string}", builtWith);
        Then("the build says nothing about Node", () => expect(problem).toBeNull());
      });
    },
  );
});
