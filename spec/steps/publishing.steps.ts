import { createHash } from "node:crypto";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { LastPublish } from "../../src/domain/changes.ts";
import { MemoryFileSystem } from "../../src/adapters/fs/memory/memory-fs.ts";
import { courseRules } from "../../src/adapters/rules/course-rules/course-rules-adapter.ts";
import { LocalTelemetry } from "../../src/adapters/telemetry/local/local-telemetry.ts";
import { runPublishing } from "../../src/adapters/cli/headless/headless.ts";
import { tutorsGenBuild, DENO_IMAGE } from "../../src/adapters/build/tutors-gen/tutors-gen-build.ts";
import { netlifyHosting, NETLIFY_HEADERS, NETLIFY_REDIRECTS, NETLIFY_TOKEN } from "../../src/adapters/hosting/netlify/netlify-hosting.ts";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { createPublishing } from "../../src/application/use-cases/publishing.ts";
import { createAccounts } from "../../src/application/use-cases/accounts.ts";
import { publishChoices } from "../../src/domain/publish.ts";
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
  /** Studio's settings: the site each course was published as, by course folder. */
  let sites: Record<string, string> = {};
  const sitesFor = (course: string) => ({ get: async () => sites[course] ?? null, set: async (site: string) => void (sites = { ...sites, [course]: site }) });

  const onComputer = (tools: Tool[]) => {
    computer = new FakeComputer(fs, tools);
    folders = new FakeFolders(fs);
    netlify = new FakeNetlify();
    secrets = new MemorySecrets();
  };
  let validator: string | null = null;
  let lastPublish: LastPublish | null = null;
  const cleanWithDeno = () => {
    lastPublish = null;
    sites = {};
    validator = null;
    fs = clean();
    onComputer(["deno"]);
  };
  const signedIn = async () => secrets.set(NETLIFY_TOKEN, "good-token");
  const run = async (command: string, site = "") => {
    const publishing = createPublishing({
      fs,
      rules: courseRules,
      build: tutorsGenBuild(computer, ROOT, validator),
      hosting: netlifyHosting({ secrets, fetch: netlify.fetch, sleep: async () => {} }),
      saveCopy: folders,
      telemetry: new LocalTelemetry(),
      newId: () => "save-1",
      sites: sitesFor(ROOT),
      lastPublish: { get: async () => lastPublish, set: async (last) => void (lastPublish = last) },
      now: () => new Date("2026-11-10T09:00:00Z"),
    });
    lines = [];
    await runPublishing(publishing, command, (line) => lines.push(line), site, "web-dev");
  };
  const savesWebsite = (_: unknown, parent: string) => run("save-website", parent);
  const saves = () => run("save");
  const publishes = (_: unknown, site: string) => run("publish", site);
  const prints = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);
  const printsSaying = (_: unknown, part: string) => expect(lines.join("\n")).toContain(part);
  const generatorRuns = () => computer.calls.filter((call) => call.includes("jsr:@tutors/tutors@") || call.includes("jsr:@tutors/tutors-lite@"));

  Rule(
    "When a lecturer publishes a course, the Studio shall save it with the standard setup it lacks, check it, build it and put it online, all in that one press.",
    ({ RuleScenario }) => {
      RuleScenario("No publishing file", ({ Given, When, Then, And }) => {
        Given("a course with no publishing file on a computer with Deno but no Docker or Podman", () => {
          validator = null;
          const files = clean().snapshot();
          delete files["netlify.toml"];
          fs = new MemoryFileSystem(files);
          onComputer(["deno"]);
        });
        And("the lecturer is signed in to Netlify", signedIn);
        When("the lecturer publishes the course as {string}", publishes);
        Then("the command shall print {string}", prints);
        And("the course shall have its publishing file", () => expect(fs.snapshot()["netlify.toml"]).toMatch(/publish\s*=\s*"json"/));
      });
    },
  );

  Rule(
    "The Studio shall remember the site each course was published as, so publishing it again is one press of Publish changes with the students' link beside it.",
    ({ RuleScenario }) => {
      RuleScenario("Published once, remembered after", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        When("the lecturer publishes the course as {string}", publishes);
        Then("Studio shall remember {string} for this course", async (_, site: string) => expect(await sitesFor(ROOT).get()).toBe(site));
        And("another course shall have no site yet", async () => expect(await sitesFor("/home/lecturer/other").get()).toBeNull());
      });
    },
  );

  Rule("If no Netlify sign-in is kept, then the Studio shall send the lecturer to Settings to sign in instead of asking for a token on the publish screen.", ({ RuleScenario }) => {
    RuleScenario("Publishing before signing in", ({ Given, When, Then, And }) => {
      Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
      When("the lecturer publishes the course as {string}", publishes);
      Then("the command shall print a line saying {string}", printsSaying);
      And("Netlify shall hold no site", () => expect(netlify.sites.size).toBe(0));
    });
  });

  Rule(
    "When a lecturer signs in to Netlify from Settings, the Studio shall open Netlify's own sign-in page in the browser and keep the token Netlify returns in the keychain.",
    ({ RuleScenario }) => {
      let opened: string[] = [];
      let accounts: ReturnType<typeof createAccounts>;
      let keychain: MemorySecrets;
      /** Netlify's ticket API: a ticket, approved after the lecturer's first look, exchanged for a token. */
      const tickets = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = new URL(String(input));
        const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
        if (url.pathname.endsWith("/oauth/tickets") && init.method === "POST") return json({ id: url.searchParams.get("client_id") === "studio-client" ? "ticket-1" : null });
        if (url.pathname.endsWith("/oauth/tickets/ticket-1/exchange")) return json({ access_token: "browser-token" });
        if (url.pathname.endsWith("/oauth/tickets/ticket-1")) return json({ authorized: opened.length > 0 });
        return new Response("", { status: 404 });
      };
      const withClient = (clientId?: string) => {
        opened = [];
        keychain = new MemorySecrets();
        accounts = createAccounts({ hosting: netlifyHosting({ secrets: keychain, fetch: tickets, sleep: async () => {}, clientId }), open: (url) => opened.push(url) });
      };
      RuleScenario("Approving Studio on Netlify's page", ({ Given, When, Then, And }) => {
        Given("a copy of Studio with a Netlify client id", () => withClient("studio-client"));
        When("the lecturer signs in to Netlify and approves Studio in the browser", async () => expect(await accounts.signInInBrowser()).toEqual({ ok: true }));
        Then("the browser shall have opened Netlify's page for the ticket", () =>
          expect(opened).toEqual(["https://app.netlify.com/authorize?response_type=ticket&ticket=ticket-1"]),
        );
        And("the keychain shall hold the token Netlify returned", async () => {
          expect(await keychain.get(NETLIFY_TOKEN)).toBe("browser-token");
          expect((await accounts.host()).signedIn).toBe(true);
        });
      });
      RuleScenario("A copy with no client id", ({ Given, Then }) => {
        Given("a copy of Studio with no Netlify client id", () => withClient(undefined));
        Then("Settings shall ask for an access token instead", async () => {
          expect((await accounts.host()).browser).toBe(false);
          expect((await accounts.signInInBrowser()).ok).toBe(false);
        });
      });
    },
  );

  Rule("While Advanced mode is off, the Studio shall leave the git hand-off and Save as a website out of the Check and Publish screens.", ({ RuleScenario }) => {
    let advanced = false;
    RuleScenario("Advanced mode off", ({ Given, Then, And }) => {
      Given("Advanced mode is off", () => {
        advanced = false;
      });
      Then("the publish screen shall offer {string} and {string} only", () =>
        expect(publishChoices(advanced)).toEqual({ publish: true, save: true, website: false, handOff: false }),
      );
      And("the check screen shall not offer the git hand-off", () => expect(publishChoices(advanced).handOff).toBe(false));
    });
    RuleScenario("Advanced mode on", ({ Given, Then, And }) => {
      Given("Advanced mode is on", () => {
        advanced = true;
      });
      Then("the publish screen shall also offer {string}", () => expect(publishChoices(advanced).website).toBe(true));
      And("the check screen shall offer the git hand-off", () => expect(publishChoices(advanced).handOff).toBe(true));
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

  const noPublishingFile = () => {
    validator = null;
    const files = clean().snapshot();
    delete files["netlify.toml"];
    fs = new MemoryFileSystem(files);
    onComputer(["deno"]);
  };
  const carries = (_: unknown, spec: string) => {
    validator = spec;
  };

  Rule(
    "When a lecturer saves or publishes a course and the Studio carries a Tutors command line that validates, the Studio shall run its `tutors validate --format json` as the last check before changing anything.",
    ({ RuleScenario }) => {
      RuleScenario("The command line checks a course before it is saved", ({ Given, When, Then, And }) => {
        Given("a course with no publishing file on a computer with Deno but no Docker or Podman", noPublishingFile);
        And("the Studio carries the Tutors command line {string}", carries);
        When("the lecturer saves the course", saves);
        Then("the computer shall have run {string}", (_, call: string) => expect(computer.calls).toContain(call));
        And("the command shall print a line saying {string}", printsSaying);
      });
      RuleScenario("No command line that validates yet", ({ Given, When, Then }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        When("the lecturer saves the course", saves);
        Then("nothing shall have been run on the computer", () => expect(computer.calls).toEqual([]));
      });
    },
  );

  Rule(
    "If the Tutors command line reports an error the course map missed, then the Studio shall change nothing, put nothing online and show the command line's own words.",
    ({ RuleScenario }) => {
      RuleScenario("The command line finds a problem", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        And("the Studio carries the Tutors command line {string}", carries);
        And("the command line reports the error {string} on {string}", (_, message: string, path: string) => {
          computer.validateReport = JSON.stringify([{ rule: "V999", severity: "error", path, message }]);
        });
        When("the lecturer publishes the course as {string}", publishes);
        Then("the command shall print a line saying {string}", printsSaying);
        And("the command shall print a line saying {string}", printsSaying);
        And("Netlify shall hold no site", () => expect(netlify.sites.size).toBe(0));
      });
      RuleScenario("The command line can't check the course", ({ Given, When, Then, And }) => {
        Given("a course with no publishing file on a computer with Deno but no Docker or Podman", noPublishingFile);
        And("the Studio carries the Tutors command line {string}", carries);
        And("the command line answers with something other than a report", () => {
          computer.validateReport = "Unknown command validate";
        });
        When("the lecturer saves the course", saves);
        Then("the command shall print a line saying {string}", printsSaying);
        And("the course shall still have no publishing file", () => expect(Object.keys(fs.snapshot())).not.toContain("netlify.toml"));
      });
    },
  );

  const asksChanges = () => run("changes");
  const publishedBefore = async (_: unknown, site: string) => {
    await run("publish", site);
    expect(lastPublish).not.toBeNull();
  };
  const text = (content: string) => new TextEncoder().encode(content);

  Rule(
    "When a lecturer opens Publish on a course published from Studio before, the Studio shall say when it last went online and list the items added, changed and removed since, by their titles.",
    ({ RuleScenario }) => {
      RuleScenario("A lab added and a talk rewritten", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        And("the course was published as {string} on 10 November 2026", publishedBefore);
        When("the lecturer writes a lab {string} called {string}", (_, path: string, title: string) => fs.write(path, text(`# ${title}\n`)));
        And("rewrites the talk {string}", (_, path: string) => fs.write(path, text("# Intro\n\nNew words.\n")));
        And("asks what changed since the last publish", asksChanges);
        Then("the command shall print {string}", prints);
        And("the command shall also print {string}", prints);
        And("the command shall print a line saying {string}", printsSaying);
      });
      RuleScenario("A week removed", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        And("the course was published as {string} on 10 November 2026", publishedBefore);
        When("the lecturer removes the folder {string}", async (_, folder: string) => {
          for (const path of Object.keys(fs.snapshot())) if (path.startsWith(`${folder}/`)) await fs.remove(path);
        });
        And("asks what changed since the last publish", asksChanges);
        Then("the command shall print {string}", prints);
      });
      RuleScenario("Nothing changed", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        And("the course was published as {string} on 10 November 2026", publishedBefore);
        When("the lecturer asks what changed since the last publish", asksChanges);
        Then("the command shall print {string}", prints);
      });
      RuleScenario("Never published from Studio", ({ Given, When, Then }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        When("the lecturer asks what changed since the last publish", asksChanges);
        Then("the command shall print {string}", prints);
      });
    },
  );

  Rule(
    "While a course has been published from Studio, the Studio shall mark each week on the course home whose files changed since then as changed since you published.",
    ({ RuleScenario }) => {
      RuleScenario("Week 1's talk rewritten after publishing", ({ Given, When, Then, And }) => {
        Given("a course with no errors on a computer with Deno but no Docker or Podman", cleanWithDeno);
        And("the lecturer is signed in to Netlify", signedIn);
        And("the course was published as {string} on 10 November 2026", publishedBefore);
        When("the lecturer rewrites the talk {string}", (_, path: string) => fs.write(path, text("# Intro\n\nNew words.\n")));
        And("asks what changed since the last publish", asksChanges);
        Then("the command shall print {string}", prints);
      });
    },
  );
});
