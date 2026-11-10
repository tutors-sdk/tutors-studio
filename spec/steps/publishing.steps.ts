import { createHash } from "node:crypto";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runPublishing } from "../../src/adapters/cli/headless/headless.ts";
import { tutorsGenBuild, DENO_IMAGE } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { netlifyHosting, NETLIFY_HEADERS, NETLIFY_REDIRECTS, NETLIFY_TOKEN } from "../../src/adapters/hosting/netlify/netlify-hosting.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { createPublishing } from "../../src/application/use-cases/publishing.ts";
import type { Tool } from "../../src/application/ports/process.ts";
import { FakeComputer, FakeFolders, FakeNetlify } from "../../tests/support/fake-publishing.ts";

const feature = await loadFeature("spec/features/publishing.feature");
const ROOT = "/home/lecturer/web-dev";

const clean = () =>
  new MemoryFileSystem({
    "course.md": "# Web Development\n",
    "netlify.toml": '[build]\n  publish = "json"\n',
    "topic-01/topic.md": "# Week 1\n",
    "topic-01/talk-1/talk.md": "# Intro\n",
    "topic-01/talk-1/slides.pdf": "%PDF",
  });

const sha1 = (text: string) => createHash("sha1").update(text).digest("hex");

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let computer: FakeComputer;
  let netlify: FakeNetlify;
  let secrets: MemorySecrets;
  let folders: FakeFolders;
  let lines: string[];

  const onComputer = (tools: Tool[]) => {
    computer = new FakeComputer(fs, tools);
    folders = new FakeFolders(fs);
    netlify = new FakeNetlify();
    secrets = new MemorySecrets();
  };
  const cleanWithDeno = () => {
    fs = clean();
    onComputer(["deno"]);
  };
  const signedIn = async () => secrets.set(NETLIFY_TOKEN, "good-token");
  const run = async (command: string, site = "") => {
    const publishing = createPublishing({
      fs,
      rules: courseRules,
      build: tutorsGenBuild(computer, ROOT),
      hosting: netlifyHosting({ secrets, fetch: netlify.fetch, sleep: async () => {} }),
      saveCopy: folders,
      telemetry: new LocalTelemetry(),
      newId: () => "save-1",
    });
    lines = [];
    await runPublishing(publishing, command, (line) => lines.push(line), site, "web-dev");
  };
  const savesWebsite = (_: unknown, parent: string) => run("save-website", parent);
  const saves = () => run("save");
  const publishes = (_: unknown, site: string) => run("publish", site);
  const prints = (_: unknown, line: string) => expect(lines).toContain(line);
  const printsSaying = (_: unknown, part: string) => expect(lines.some((line) => line.includes(part))).toBe(true);
  const generatorRuns = () => computer.calls.filter((call) => call.includes("jsr:@tutors/tutors@") || call.includes("jsr:@tutors/tutors-lite@"));

  Rule("When a lecturer publishes a course that has no netlify.toml straight from Studio, the Studio shall publish it without adding that file.", ({ RuleScenario }) => {
    RuleScenario("No publishing file", ({ Given, When, Then, And }) => {
      Given("a course with no publishing file on a computer with Deno but no Docker or Podman", () => {
        const files = clean().snapshot();
        delete files["netlify.toml"];
        fs = new MemoryFileSystem(files);
        onComputer(["deno"]);
      });
      And("the lecturer is signed in to Netlify", signedIn);
      When("the lecturer publishes the course as {string}", publishes);
      Then("the command shall print {string}", prints);
      And("the course shall still have no publishing file", () => expect(Object.keys(fs.snapshot())).not.toContain("netlify.toml"));
    });
  });

  Rule(
    "When a lecturer publishes a course to Netlify, the Studio shall build it with the Tutors generator, send only the files Netlify does not already hold, and give the tutors.dev link.",
    ({ RuleScenario }) => {
      RuleScenario("The first publish creates the site", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        When("the lecturer publishes the course as {string}", publishes);
        Then("the command shall print {string}", prints);
        And("the command shall also print {string}", prints);
        And("Netlify shall hold the site {string} with the headers file that lets the reader fetch it", (_, site: string) => {
          expect(netlify.sites.has(site)).toBe(true);
          const deploy = [...netlify.deploys.values()][0];
          expect(deploy.files["/_headers"]).toBe(sha1(NETLIFY_HEADERS));
          expect(deploy.uploaded).toContain("_headers");
        });
      });

      RuleScenario("Publishing again sends only what changed", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        And("Netlify already holds every file but the course's tutors.json", () => {
          for (const text of ["<html></html>", "%PDF", NETLIFY_HEADERS, NETLIFY_REDIRECTS]) netlify.known.add(sha1(text));
        });
        When("the lecturer publishes the course as {string}", publishes);
        Then("the command shall print {string}", prints);
      });

      RuleScenario("Docker builds the course when Deno is not installed", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Docker but no Deno", () => {
          fs = clean();
          onComputer(["docker"]);
        });
        And("the lecturer is signed in to Netlify", signedIn);
        When("the lecturer publishes the course as {string}", publishes);
        Then("the command shall print {string}", prints);
        And("the generator shall have run in the Deno container over the course folder", () => {
          expect(generatorRuns()).toEqual([expect.stringContaining(`docker run --rm -v ${ROOT}:/course -w /course ${DENO_IMAGE} run -A`)]);
        });
      });
    },
  );

  Rule("If a course has errors, then the Studio shall refuse to publish it and say how many to fix.", ({ RuleScenario }) => {
    RuleScenario("A course with a Week 3 folder of slides", ({ Given, When, Then, And }) => {
      Given('a course with a "Week 3" folder of slides on a computer with Deno but no Docker or Podman', async () => {
        fs = clean();
        await fs.write("Week 3/talk-01/talk.md", new TextEncoder().encode("# Layout\n"));
        await fs.write("Week 3/talk-01/slides.pdf", new TextEncoder().encode("%PDF"));
        onComputer(["deno"]);
      });
      And("the lecturer is signed in to Netlify", signedIn);
      When("the lecturer publishes the course as {string}", publishes);
      Then("the command shall print {string}", prints);
      And("the generator shall not have run", () => expect(generatorRuns()).toEqual([]));
    });
  });

  Rule("If Netlify refuses the access token, then the Studio shall publish nothing and say how to make a new token.", ({ RuleScenario }) => {
    RuleScenario("An expired token", ({ Given, When, Then, And }) => {
      Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
      And("the lecturer is signed in to Netlify with a token Netlify no longer accepts", () => secrets.set(NETLIFY_TOKEN, "expired-token"));
      When("the lecturer publishes the course as {string}", publishes);
      Then("the command shall print a line saying {string}", printsSaying);
      And("Netlify shall hold no site", () => expect(netlify.sites.size).toBe(0));
    });
  });
  Rule(
    "When a lecturer saves a course as a website, the Studio shall build it with tutors-lite and save the web pages as a new folder in the folder the lecturer chose, never over a folder already there.",
    ({ RuleScenario }) => {
      RuleScenario("Saving the website twice", ({ Given, When, Then, And }) => {
        const FIRST = "/home/lecturer/Desktop/web-dev-website";
        let first: [string, string][] = [];
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        When("the lecturer saves the course as a website in {string}", savesWebsite);
        Then("the command shall print {string}", prints);
        And(`"/home/lecturer/Desktop/web-dev-website" shall hold the course's pages and its slides`, () => {
          first = [...folders.files.entries()].filter(([path]) => path.startsWith(`${FIRST}/`));
          expect(first.map(([path]) => path).sort()).toEqual([`${FIRST}/index.html`, `${FIRST}/topic-01/talk-1/index.html`, `${FIRST}/topic-01/talk-1/slides.pdf`]);
          expect(generatorRuns()).toEqual(["deno run -A --node-modules-dir=none jsr:@tutors/tutors-lite@5.3.0"]);
        });
        When("the lecturer saves the course as a website in {string} again", async (_, parent: string) => {
          await fs.write("html/index.html", new TextEncoder().encode("<h1>Web Development, week 2</h1>"));
          await savesWebsite(_, parent);
        });
        Then("the command shall then print {string}", prints);
        And("the first website shall be as it was", () => {
          expect([...folders.files.entries()].filter(([path]) => path.startsWith(`${FIRST}/`))).toEqual(first);
        });
      });
    },
  );

  Rule("If a course has errors, then the Studio shall refuse to save it as a website and say how many to fix.", ({ RuleScenario }) => {
    RuleScenario("A course with a Week 3 folder of slides", ({ Given, When, Then, And }) => {
      Given('a course with a "Week 3" folder of slides on a computer with Deno but no Docker or Podman', async () => {
        fs = clean();
        await fs.write("Week 3/talk-01/talk.md", new TextEncoder().encode("# Layout\n"));
        await fs.write("Week 3/talk-01/slides.pdf", new TextEncoder().encode("%PDF"));
        onComputer(["deno"]);
      });
      When("the lecturer saves the course as a website in {string}", savesWebsite);
      Then("the command shall print {string}", prints);
      And("the generator shall not have run", () => expect(generatorRuns()).toEqual([]));
      And("nothing shall have been saved", () => expect(folders.files.size).toBe(0));
    });
  });
  Rule(
    "When a lecturer saves a course from Publish, the Studio shall confirm it passes the Tutors rules and add the standard setup it lacks in the course's own folder, without building it or sending it anywhere.",
    ({ RuleScenario }) => {
      RuleScenario("A course with no publishing file, on a computer with neither Deno nor containers", ({ Given, When, Then, And }) => {
        Given("a course with no publishing file on a computer with no Deno, Docker or Podman", () => {
          const files = clean().snapshot();
          delete files["netlify.toml"];
          fs = new MemoryFileSystem(files);
          onComputer([]);
        });
        When("the lecturer saves the course", saves);
        Then("the command shall print {string}", prints);
        And("the command shall also print {string}", prints);
        And("the course shall now have a netlify.toml that publishes the json folder", () => expect(fs.snapshot()["netlify.toml"]).toMatch(/publish\s*=\s*"json"/));
        And("nothing shall have been run on the computer", () => expect(computer.calls).toEqual([]));
        And("Netlify shall hold no site", () => expect(netlify.sites.size).toBe(0));
      });

      RuleScenario("Saving a course that already has its setup", ({ Given, When, Then, And }) => {
        let before: Record<string, string> = {};
        Given("a course with no errors on a computer with Deno but no Docker or Podman", async () => {
          cleanWithDeno();
          await fs.write(".gitignore", new TextEncoder().encode("json/\n"));
          before = fs.snapshot();
        });
        When("the lecturer saves the course", saves);
        Then("the command shall print {string}", prints);
        And("the course shall be as it was, with the json folder left out of git", () => expect(fs.snapshot()).toEqual(before));
      });
    },
  );

  Rule("If a course has errors when the lecturer saves it, then the Studio shall change nothing and say how many to fix.", ({ RuleScenario }) => {
    RuleScenario("A course with a Week 3 folder of slides", ({ Given, When, Then, And }) => {
      Given('a course with a "Week 3" folder of slides and no publishing file on a computer with Deno but no Docker or Podman', async () => {
        const files = clean().snapshot();
        delete files["netlify.toml"];
        fs = new MemoryFileSystem(files);
        await fs.write("Week 3/talk-01/talk.md", new TextEncoder().encode("# Layout\n"));
        await fs.write("Week 3/talk-01/slides.pdf", new TextEncoder().encode("%PDF"));
        onComputer(["deno"]);
      });
      When("the lecturer saves the course", saves);
      Then("the command shall print {string}", prints);
      And("the course shall still have no publishing file", () => expect(Object.keys(fs.snapshot())).not.toContain("netlify.toml"));
    });
  });
});
