import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { runLive } from "../../src/adapters/cli/headless/headless.ts";
import { nodeLocalTutors } from "../../src/adapters/local-tutors/node/node-local-tutors.ts";
import { nodeInsideTutors } from "../../src/adapters/local-tutors/node/node-inside-tutors.ts";
import { READER_CSP } from "../../src/domain/live-tutors.ts";
import { createLiveTutors } from "../../src/application/use-cases/live-tutors.ts";
import { fakeBuild, fakeTutorsFolder, removeFolder, runningReader } from "../../tests/support/fake-tutors.ts";

const feature = await loadFeature("spec/features/live-tutors.feature");

const answers = async (url: string) => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
};

const eventually = async (check: () => boolean | Promise<boolean>, what: string) => {
  const until = Date.now() + 20_000;
  while (!(await check())) {
    if (Date.now() > until) throw new Error(`Waited too long for ${what}`);
    await new Promise((done) => setTimeout(done, 50));
  }
};

describeFeature(feature, ({ Rule, BeforeEachScenario, AfterEachScenario }) => {
  let course: string;
  let tutors: string;
  let lines: string[];
  let build: ReturnType<typeof fakeBuild>;
  let readerOrigin: string | undefined;
  let closeReader: (() => Promise<void>) | undefined;
  let change: () => void;
  let stopLive: () => void;
  let running: Promise<number> | null;
  /** The reader's static files inside Studio, or null for a copy without them. */
  let insideReader: string | null;
  const folders: string[] = [];

  BeforeEachScenario(() => {
    lines = [];
    readerOrigin = undefined;
    closeReader = undefined;
    running = null;
    insideReader = null;
    tutors = "";
    change = () => {};
    stopLive = () => {};
  });
  AfterEachScenario(async () => {
    stopLive();
    await running;
    await closeReader?.();
    for (const folder of folders.splice(0)) removeFolder(folder);
  });

  const made = (folder: string) => (folders.push(folder), folder);
  const aCourse = (_: unknown, title: string) => {
    course = made(mkdtempSync(join(tmpdir(), "course-")));
    writeFileSync(join(course, "course.md"), `# ${title}\n`);
    build = fakeBuild(course);
  };
  const aCopyOfTutors = () => void (tutors = made(fakeTutorsFolder()));
  const goesLive = async () => {
    let chosen: string | null = null;
    const live = createLiveTutors({
      build,
      tutors: nodeLocalTutors(course, (line) => lines.push(line), { readerOrigin: readerOrigin ?? "http://127.0.0.1:1" }),
      inside: nodeInsideTutors(course, insideReader, (line) => lines.push(line)),
      folder: { get: async () => chosen, set: async (folder) => void (chosen = folder) },
    });
    const stopped = new Promise<void>((done) => (stopLive = done));
    const watch = (onChange: () => void) => {
      change = onChange;
      return () => {};
    };
    running = runLive(live, tutors, (line) => lines.push(line), watch, stopped);
    await Promise.race([eventually(() => lines.some((line) => line.startsWith("Live in Tutors: ")), "the course to go live"), running]);
  };
  /** The reader's static files, as `pnpm bundle reader` leaves them: a stand-in page as its fallback. */
  const theInsideReader = () => {
    insideReader = made(mkdtempSync(join(tmpdir(), "reader-")));
    writeFileSync(join(insideReader, "200.html"), "<html>Tutors reader</html>");
  };
  const prints = (_: unknown, line: string) => expect(lines, lines.join("\n")).toContain(line);
  const link = () => lines.find((line) => line.startsWith("Live in Tutors: "))!.slice("Live in Tutors: ".length);
  const courseAddress = () => `http://${link().split("/course/")[1]}`;
  const readerAddress = () => link().split("/course/")[0];
  const servedTitle = async (_: unknown, title: string) => {
    await eventually(async () => {
      const response = await fetch(`${courseAddress()}/tutors.json`);
      return ((await response.json()) as { title: string }).title === title && response.headers.get("access-control-allow-origin") === "*";
    }, `the course served as "${title}"`);
  };
  const liveCourse = async (_: unknown, title: string) => {
    aCourse(_, title);
    aCopyOfTutors();
    await goesLive();
  };
  const rewrite = (text: string) => {
    writeFileSync(join(course, "course.md"), text);
    change();
  };

  Rule(
    "If the folder a lecturer chooses as their copy of Tutors isn't the Tutors repository with its dependencies installed, then the Studio shall say what to do in that folder and start nothing.",
    ({ RuleScenario }) => {
      RuleScenario("A folder that isn't Tutors", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("a folder of notes, not a copy of Tutors", () => {
          tutors = made(mkdtempSync(join(tmpdir(), "notes-")));
          mkdirSync(join(tutors, "week-1"));
        });
        When("the lecturer shows the course live in that folder", goesLive);
        Then("the command shall print {string}", prints);
        And("the course shall not have been built", () => expect(existsSync(join(course, "json"))).toBe(false));
      });

      RuleScenario("Tutors cloned but not set up", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("a copy of Tutors with no dependencies installed", () => void (tutors = made(fakeTutorsFolder({ installed: false }))));
        When("the lecturer shows the course live in that folder", goesLive);
        Then("the command shall print {string}", prints);
      });
    },
  );

  Rule(
    "When a lecturer asks to see the course in Tutors on this computer, the Studio shall build the course, serve it on this computer only, start the reader from the lecturer's copy of Tutors unless one is already running, and show the course in it.",
    ({ RuleScenario }) => {
      RuleScenario("Tutors started from the lecturer's copy", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("a copy of Tutors", aCopyOfTutors);
        When("the lecturer shows the course live in that folder", goesLive);
        Then("the command shall print {string}", prints);
        And("the link shall open the reader's course page on the course served on this computer", () =>
          expect(link()).toMatch(/^http:\/\/localhost:\d+\/course\/127\.0\.0\.1:\d+$/),
        );
        And("the reader shall have been started with no sign-in", async () => {
          const health = (await (await fetch(`${readerAddress()}/healthz`)).json()) as { app: string; anon: string };
          expect(health).toEqual({ app: "tutors-reader", anon: "TRUE" });
        });
        And("the course served there shall be titled {string}, for any page to fetch", servedTitle);
      });

      RuleScenario("Tutors already running", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("a copy of Tutors", aCopyOfTutors);
        And("the Tutors reader already running", async () => {
          const reader = await runningReader();
          readerOrigin = reader.origin;
          closeReader = reader.close;
        });
        When("the lecturer shows the course live in that folder", goesLive);
        Then("the command shall print {string}", prints);
        And("the link shall open the running reader's course page", () => expect(link().startsWith(`${readerOrigin}/course/127.0.0.1:`)).toBe(true));
      });
    },
  );

  Rule(
    "While a course is live in Tutors on this computer, the Studio shall rebuild it after each change and reload Tutors on the page it shows, rebuilding once more for changes made during a rebuild.",
    ({ RuleScenario }) => {
      RuleScenario("A new title shows in Tutors", ({ Given, When, Then, And }) => {
        Given("a course called {string} live in Tutors", liveCourse);
        When("the lecturer renames the course {string}", (_, title: string) => rewrite(`# ${title}\n`));
        Then("the course served there shall be titled {string}, for any page to fetch", servedTitle);
        And("the command shall print {string}", prints);
      });
    },
  );

  Rule("If a rebuild fails while a course is live, then the Studio shall keep the last build in Tutors and say why.", ({ RuleScenario }) => {
    RuleScenario("A change that doesn't build", ({ Given, When, Then, And }) => {
      Given("a course called {string} live in Tutors", liveCourse);
      When("the lecturer makes a change the generator can't build", async () => {
        rewrite("# BROKEN\n");
        await eventually(() => lines.some((line) => line.startsWith("Tutors still shows the last build.")), "the failed rebuild");
      });
      Then("the command shall print {string}", prints);
      And("the course served there shall be titled {string}, for any page to fetch", servedTitle);
    });
  });

  Rule(
    "While a live course is being rebuilt, the Studio shall say that Tutors is updating, in Studio and over the course in the Tutors window, until Tutors shows the change or says it didn't build.",
    ({ RuleScenario }) => {
      RuleScenario("Updating, then up to date", ({ Given, When, Then, And }) => {
        Given("a course called {string} live in Tutors", liveCourse);
        When("the lecturer renames the course {string}", async (_, title: string) => {
          rewrite(`# ${title}\n`);
          await eventually(() => lines.some((line) => line.startsWith("Tutors is up to date")), "the rebuild");
        });
        Then("the command shall print {string} before it rebuilds", (_, line: string) => {
          const updating = lines.indexOf(line);
          expect(updating, lines.join("\n")).toBeGreaterThan(-1);
          expect(updating).toBeLessThan(lines.findIndex((l) => l.startsWith("Tutors is up to date")));
        });
        And("the course served there shall be titled {string}, for any page to fetch", servedTitle);
      });

      RuleScenario("Updating, then a change that didn't build", ({ Given, When, Then }) => {
        Given("a course called {string} live in Tutors", liveCourse);
        When("the lecturer makes a change the generator can't build", async () => {
          rewrite("# BROKEN\n");
          await eventually(() => lines.some((line) => line.includes("This change didn't build")), "the failed rebuild");
        });
        Then("the command shall print {string}", prints);
      });
    },
  );

  Rule("When a rebuild of a live course finishes, the Studio shall say that Tutors is up to date and how long the rebuild took.", ({ RuleScenario }) => {
    RuleScenario("Up to date, and how long it took", ({ Given, When, Then }) => {
      Given("a course called {string} live in Tutors", liveCourse);
      When("the lecturer renames the course {string}", async (_, title: string) => {
        rewrite(`# ${title}\n`);
        await eventually(() => lines.some((line) => line.startsWith("Tutors is up to date")), "the rebuild");
      });
      Then("the command shall say Tutors is up to date and how many seconds the rebuild took", () =>
        expect(lines).toContainEqual(expect.stringMatching(/^Tutors is up to date: rebuilt in \d+(\.\d)? seconds\.$/)),
      );
    });
  });

  Rule("When the lecturer stops the live course, leaves it or quits Studio, the Studio shall stop serving it and stop any reader Studio started.", ({ RuleScenario }) => {
    RuleScenario("Stopping", ({ Given, When, Then, And }) => {
      let course: string;
      let reader: string;
      Given("a course called {string} live in Tutors", async (_, title: string) => {
        await liveCourse(_, title);
        course = courseAddress();
        reader = readerAddress();
      });
      When("the lecturer stops the live course", async () => {
        stopLive();
        await running;
      });
      Then("the command shall print {string}", prints);
      And("nothing shall answer at the course's address", async () => expect(await answers(`${course}/tutors.json`)).toBe(false));
      And("nothing shall answer at the reader's address", async () => eventually(async () => !(await answers(`${reader}/healthz`)), "the reader to stop"));
    });
  });
  Rule(
    "When a lecturer asks to see the course in Tutors and has chosen no copy of Tutors of their own, the Studio shall build the course and show it in the Tutors reader inside Studio, served on this computer only.",
    ({ RuleScenario }) => {
      RuleScenario("The Tutors inside Studio", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("the Tutors reader inside Studio", theInsideReader);
        When("the lecturer shows the course live with no copy of Tutors named", goesLive);
        Then("the command shall print {string}", prints);
        And("the link shall open the reader inside Studio on 127.0.0.1, on the course served on this computer", () =>
          expect(link()).toMatch(/^http:\/\/127\.0\.0\.1:820\d\/course\/127\.0\.0\.1:819\d$/),
        );
        And("the course served there shall be titled {string}, for any page to fetch", servedTitle);
      });
    },
  );

  Rule(
    "The Studio shall serve the Tutors reader inside it on 127.0.0.1 only, to GET and HEAD only, answering its own page for any path that names no file and sending its content security policy.",
    ({ RuleScenario }) => {
      RuleScenario("What the reader inside Studio answers", ({ Given, Then, And }) => {
        Given("a course called {string} live in the Tutors inside Studio", async (_, title: string) => {
          aCourse(_, title);
          theInsideReader();
          await goesLive();
        });
        Then("the reader shall answer the course's page with its own page and its content security policy", async () => {
          const response = await fetch(link());
          expect(response.status).toBe(200);
          expect(await response.text()).toBe("<html>Tutors reader</html>");
          expect(response.headers.get("content-security-policy")).toBe(READER_CSP);
          expect(response.headers.get("access-control-allow-origin")).toBeNull();
        });
        And("the reader shall refuse a POST", async () => expect((await fetch(`${readerAddress()}/api/actor`, { method: "POST" })).status).toBe(405));
        And("the reader shall answer a path that leaves its folder with its own page, not the file", async () => {
          writeFileSync(join(insideReader!, "..", "secret.txt"), "not for the reader");
          const response = await fetch(`${readerAddress()}/%2e%2e/secret.txt`);
          expect(await response.text()).not.toContain("not for the reader");
        });
      });
    },
  );

  Rule(
    "If a lecturer asks to see the course in the Tutors inside Studio and this copy of Studio carries no Tutors reader, then the Studio shall show nothing and say to install Studio again.",
    ({ RuleScenario }) => {
      RuleScenario("A copy without the reader", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("a copy of Studio without the Tutors reader", () => void (insideReader = null));
        When("the lecturer shows the course live with no copy of Tutors named", goesLive);
        Then("the command shall print {string}", prints);
      });
    },
  );
});
