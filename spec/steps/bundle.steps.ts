import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { fetchParts, parseBundle, pinsFor, readBundle, sha256, stalePins, type Bundle } from "../../scripts/bundle.ts";
import { TUTORS_RELEASE } from "../../src/domain/bundle.ts";
import { TUTORS_GENERATOR, WEBSITE_GENERATOR } from "../../src/domain/publish.ts";
import { DENO_IMAGE } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { createUpdates } from "../../src/application/use-cases/updates.ts";
import { noUpdates } from "../../src/adapters/updates/none/no-updates.ts";

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
      And("Studio runs Deno in {string} and the manifest's Deno", (_, image: string) => expect(DENO_IMAGE).toBe(`${image}${bundle.deno}`));
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
      Then("the check names {string} and {string}", (_, first: string, second: string) => expect(stale).toEqual([first, second]));
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
});
