import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { runLive } from "../../src/adapters/cli/headless/headless.ts";
import { nodeLocalTutors } from "../../src/adapters/local-tutors/node/node-local-tutors.ts";
import { nodeInsideTutors } from "../../src/adapters/local-tutors/node/node-inside-tutors.ts";
import { READER_CSP, tutorsInUse } from "../../src/domain/live-tutors.ts";
import { TUTORS_RELEASE } from "../../src/domain/bundle.ts";
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

  /** The lecturer's own copy of Tutors, recorded rather than run: these rules are about which Tutors is used. */
  let own: { chosen: string | null; started: number; shown: string[] };
  let advanced = false;
  let outcome: { ok: true; link: string } | { ok: false; reason: string } | null = null;
  const shown: string[] = [];
  const liveWith = () => {
    const inside = nodeInsideTutors(course ?? "", insideReader, (line) => lines.push(line));
    const watched = { ...inside, show: async (link: string) => void shown.push(link) };
    const live = createLiveTutors({
      build,
      tutors: {
        facts: async () => ({ packageName: "tutors-mono-repo", reader: true, installed: true }),
        start: async () => (own.started++, { ok: true, link: "http://localhost:5173/course/127.0.0.1:8190", startedReader: false }),
<<<<<<< HEAD
        home: async () => ({ ok: true, link: "http://localhost:5173/" }),
=======
>>>>>>> origin/claude/project-thread-ybei6e
        show: async (link) => void own.shown.push(link),
        refresh: async () => {},
        note: async () => {},
        stop: async () => {},
      },
      inside: watched,
      folder: { get: async () => own.chosen, set: async (folder) => void (own.chosen = folder) },
      ownAllowed: async () => advanced,
    });
    stopLive = () => void live.stop();
    return live;
  };
  const showsLive = async () => {
    outcome = await liveWith().start();
  };
  const ownCopy = (on: boolean) => () => {
    own.chosen = "/home/me/tutors-mono-repo";
    advanced = on;
  };
  const insideShown = () => {
    expect(outcome?.ok).toBe(true);
    expect(shown.at(-1)).toMatch(/^http:\/\/127\.0\.0\.1:820\d\/course\/127\.0\.0\.1:819\d$/);
    expect(own.started).toBe(0);
  };
  BeforeEachScenario(() => {
    own = { chosen: null, started: 0, shown: [] };
    advanced = false;
    outcome = null;
    shown.length = 0;
    build = fakeBuild(made(mkdtempSync(join(tmpdir(), "no-course-"))));
  });

  Rule(
    "While Advanced mode is off, the Studio shall show a course in the Tutors inside Studio and never ask for a copy of Tutors of the lecturer's own, even one chosen before.",
    ({ RuleScenario }) => {
      RuleScenario("A copy chosen before is set aside", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("the Tutors reader inside Studio", theInsideReader);
        And("a copy of Tutors chosen before Advanced mode was turned off", ownCopy(false));
        When("the lecturer shows the course live", showsLive);
        Then("the course shall show in the Tutors inside Studio", insideShown);
      });
      RuleScenario("A copy of Studio without the reader", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("a copy of Studio without the Tutors reader", () => void (insideReader = null));
        When("the lecturer shows the course live", async () => {
          outcome = await createLiveTutors({
            build,
            tutors: {
              facts: async () => ({ packageName: null, reader: false, installed: false }),
              start: async () => ({ ok: false, reason: "", detail: "" }),
              show: async () => {},
              refresh: async () => {},
              note: async () => {},
              stop: async () => {},
            },
            folder: { get: async () => null, set: async () => {} },
            ownAllowed: async () => false,
          }).start();
        });
        Then("Studio shall say {string} and not ask for a copy of Tutors", (_, words: string) => {
          expect(outcome?.ok).toBe(false);
          const reason = outcome !== null && !outcome.ok ? outcome.reason : "";
          expect(reason).toContain(words);
          expect(reason).not.toContain("Choose your copy");
        });
      });
    },
  );

  Rule(
    "Where Advanced mode is on, the Studio shall let the lecturer show a course in their own copy of Tutors, such as a developer checkout, instead of the Tutors inside Studio.",
    ({ RuleScenario }) => {
      RuleScenario("A developer checkout", ({ Given, When, Then, And }) => {
        Given("a course called {string}", aCourse);
        And("the Tutors reader inside Studio", theInsideReader);
        And("a copy of Tutors chosen in Advanced mode", ownCopy(true));
        When("the lecturer shows the course live", showsLive);
        Then("the course shall show in the lecturer's own copy of Tutors", () => {
          expect(own.started).toBe(1);
          expect(own.shown).toEqual(["http://localhost:5173/course/127.0.0.1:8190"]);
          expect(shown).toEqual([]);
        });
      });
    },
  );

  Rule(
    "When the lecturer asks to view Tutors locally, the Studio shall open the Tutors reader's home page in the Tutors window, served on this computer only, building no course.",
    ({ RuleScenario }) => {
      RuleScenario("Tutors' own home page", ({ Given, When, Then, And }) => {
        Given("the Tutors reader inside Studio", theInsideReader);
        When("the lecturer views Tutors locally", async () => {
          outcome = await liveWith().home();
        });
        Then("the Tutors window shall show the reader's home page on 127.0.0.1", async () => {
          expect(outcome?.ok).toBe(true);
          expect(shown).toHaveLength(1);
          expect(shown[0]).toMatch(/^http:\/\/127\.0\.0\.1:820\d\/$/);
          // A connection kept from an earlier scenario's reader may be closed under the first fetch: ask again.
          await eventually(async () => {
            try {
              return (await (await fetch(shown[0])).text()) === "<html>Tutors reader</html>";
            } catch {
              return false;
            }
          }, "the reader's home page");
        });
        And("no course shall have been built", () => expect(build.builds).toBe(0));
      });
    },
  );

  Rule(
    "When the lecturer asks to view their course in Tutors from the course's contents, the Studio shall build the course and show it in the Tutors window, live from then on.",
    ({ RuleScenario }) => {
      RuleScenario("From the contents", ({ Given, When, Then, And }) => {
        let live: ReturnType<typeof liveWith>;
        Given("a course called {string}", aCourse);
        And("the Tutors reader inside Studio", theInsideReader);
        When("the lecturer views their course in Tutors from its contents", async () => {
          live = liveWith();
          outcome = await live.start();
        });
        Then("the Tutors window shall show the course", insideShown);
        And("the course shall be live in Tutors", () => {
          expect(build.builds).toBe(1);
          expect(live.live).toBe(true);
        });
      });
    },
  );
<<<<<<< HEAD

  Rule(
    "While Advanced mode is on, the Studio shall say in Settings which Tutors it shows courses in: the one inside it with its release, or the lecturer's own copy.",
    ({ RuleScenario }) => {
      RuleScenario("Inside, then a developer copy", ({ Given, Then, When }) => {
        let live: ReturnType<typeof liveWith>;
        const said = async () => tutorsInUse(await live.folder(), live.inside, TUTORS_RELEASE);
        Given("the Tutors reader inside Studio", () => {
          theInsideReader();
          advanced = true;
          live = liveWith();
        });
        Then("Settings shall say {string} and the release inside it", async (_, words: string) => expect(await said()).toBe(`${words} (Tutors ${TUTORS_RELEASE})`));
        When("the lecturer chooses a copy of Tutors in Advanced mode", async () => expect((await live.choose("/home/me/tutors-mono-repo")).ok).toBe(true));
        Then("Settings shall then say {string}", async (_, words: string) => expect(await said()).toBe(words));
      });
    },
  );

  Rule(
    "When the lecturer starts, stops or switches Tutors in Settings, the Studio shall open that Tutors on its home page, stop it, or stop it and use the copy chosen from then on.",
    ({ RuleScenario }) => {
      RuleScenario("Start, stop, switch", ({ Given, When, Then }) => {
        let live: ReturnType<typeof liveWith>;
        Given("the Tutors reader inside Studio", () => {
          theInsideReader();
          advanced = true;
          live = liveWith();
        });
        When("the lecturer starts Tutors from Settings", async () => {
          outcome = await live.home();
        });
        Then("the Tutors window shall show the reader's home page on 127.0.0.1", () => {
          expect(outcome?.ok).toBe(true);
          expect(shown.at(-1)).toMatch(/^http:\/\/127\.0\.0\.1:820\d\/$/);
        });
        When("the lecturer stops it and switches to a copy of Tutors in Advanced mode", async () => {
          await live.stop();
          expect((await live.choose("/home/me/tutors-mono-repo")).ok).toBe(true);
        });
        Then("starting Tutors again shall start the lecturer's own copy", async () => {
          outcome = await live.home();
          expect(outcome).toEqual({ ok: true, link: "http://localhost:5173/" });
          expect(own.shown).toEqual(["http://localhost:5173/"]);
        });
      });
    },
  );
=======
>>>>>>> origin/claude/project-thread-ybei6e
});
