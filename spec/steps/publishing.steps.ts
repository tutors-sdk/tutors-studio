import { createHash } from "node:crypto";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runPublishing } from "../../src/adapters/cli/headless/headless.ts";
import { tutorsGenBuild, DENO_IMAGE } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { containerReader, READER_IMAGE } from "../../src/adapters/reader/container/container-reader.ts";
import { netlifyHosting, NETLIFY_HEADERS, NETLIFY_REDIRECTS, NETLIFY_TOKEN } from "../../src/adapters/hosting/netlify/netlify-hosting.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { createPublishing } from "../../src/application/use-cases/publishing.ts";
import type { Tool } from "../../src/application/ports/process.ts";
import { FakeComputer, FakeNetlify } from "../../tests/support/fake-publishing.ts";

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
  let lines: string[];

  const onComputer = (tools: Tool[]) => {
    computer = new FakeComputer(fs, tools);
    netlify = new FakeNetlify();
    secrets = new MemorySecrets();
  };
  const cleanWithDocker = () => {
    fs = clean();
    onComputer(["docker"]);
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
      reader: containerReader(computer, { courseRoot: ROOT, answers: async () => true, sleep: async () => {} }),
      hosting: netlifyHosting({ secrets, fetch: netlify.fetch, sleep: async () => {} }),
      telemetry: new LocalTelemetry(),
    });
    lines = [];
    await runPublishing(publishing, command, (line) => lines.push(line), site);
  };
  const previews = () => run("preview-here");
  const publishes = (_: unknown, site: string) => run("publish", site);
  const prints = (_: unknown, line: string) => expect(lines).toContain(line);
  const printsSaying = (_: unknown, part: string) => expect(lines.some((line) => line.includes(part))).toBe(true);
  const generatorRuns = () => computer.calls.filter((call) => call.includes("jsr:@tutors/tutors@"));

  Rule(
    "When a lecturer previews a course on this computer, the Studio shall build it with the Tutors generator and show it in a Tutors reader running in a container on this computer.",
    ({ RuleScenario }) => {
      RuleScenario("Docker is installed and Deno is not", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Docker but no Deno", cleanWithDocker);
        When("the lecturer previews the course on this computer", previews);
        Then("the command shall print {string}", prints);
        And("the generator shall have run in the Deno container over the course folder", () => {
          expect(generatorRuns()).toEqual([expect.stringContaining(`docker run --rm -v ${ROOT}:/course -w /course ${DENO_IMAGE} run -A`)]);
        });
        And("the course server shall serve the course's json folder read-only", () => {
          expect(computer.calls.some((call) => call.includes(`-v ${ROOT}/json:/srv:ro`))).toBe(true);
        });
        And("the reader container shall run in anonymous mode", () => {
          expect(computer.calls.some((call) => call.includes("PUBLIC_ANON_MODE=TRUE") && call.endsWith(READER_IMAGE))).toBe(true);
        });
      });
    },
  );

  Rule("If neither Docker nor Podman is on the computer, then the Studio shall start nothing and say what to install.", ({ RuleScenario }) => {
    RuleScenario("Deno builds the course but nothing can run the reader", ({ Given, When, Then, And }) => {
      Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
      When("the lecturer previews the course on this computer", previews);
      Then("the command shall print a line saying {string}", printsSaying);
      And("no container shall have been started", () => {
        expect(computer.calls.filter((call) => / run -d /.test(call))).toEqual([]);
      });
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
});
