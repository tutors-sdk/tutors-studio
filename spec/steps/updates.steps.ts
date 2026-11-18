import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { UpdatesPort } from "../../src/application/ports/updates.ts";
import type { UpdateChannel } from "../../src/domain/updates.ts";
import { studioBusy } from "../../src/application/busy.ts";
import { sessionUpdatePreferences, type ReadyUpdate } from "../../src/application/use-cases/updates.ts";
import { createUpdates, type UpdateCheck } from "../../src/application/use-cases/updates.ts";
import { noUpdates } from "../../src/adapters/updates/none/no-updates.ts";

const feature = await loadFeature("spec/features/updates.feature");

/** The release page in memory: the newest version on each channel, what was asked, downloaded and installed. */
class Releases implements UpdatesPort {
  installed: string[] = [];
  downloaded: string[] = [];
  checks: UpdateChannel[] = [];
  restarted = false;
  /** A download whose signature doesn't match the key in the app. */
  forged = false;
  constructor(
    private readonly newest: string | null,
    private readonly tutors: string | null = null,
    private readonly beta: string | null = null,
  ) {}
  version = async () => "0.1.0";
  private offered: string | null = null;
  check = async (channel: UpdateChannel) => {
    this.checks.push(channel);
    this.offered = channel === "beta" && this.beta !== null ? this.beta : this.newest;
    return this.offered === null ? { kind: "current" as const, version: "0.1.0" } : { kind: "newer" as const, version: this.offered, notes: "", tutors: this.tutors };
  };
  download = async () => {
    if (this.forged) return { ok: false as const, reason: "the signature verification failed", unverified: true };
    if (this.offered !== null) this.downloaded.push(this.offered);
    return { ok: true as const };
  };
  install = async (restart: boolean) => {
    if (this.offered !== null) this.installed.push(this.offered);
    this.restarted = restart;
    return { ok: true as const };
  };
}

describeFeature(feature, ({ Rule }) => {
  let releases: Releases;
  let updates: ReturnType<typeof createUpdates>;
  let found: UpdateCheck;
  const released = (_: unknown, version: string) => {
    releases = new Releases(version);
    updates = createUpdates(releases);
  };
  const checks = async () => {
    found = await updates.check();
  };
  const says = (_: unknown, words: string) => expect(found.words).toBe(words);

  Rule("When a lecturer checks for a newer Studio and one is released, the Studio shall name its version and install nothing until the lecturer accepts.", ({ RuleScenario }) => {
    RuleScenario("Version 0.2.0 is out", ({ Given, When, Then, And }) => {
      Given("Studio 0.1.0 with version {string} released", released);
      When("the lecturer checks for a newer version", checks);
      Then("Studio shall say {string}", says);
      And("nothing shall be installed", () => expect(releases.installed).toEqual([]));
    });
    RuleScenario("Already the newest", ({ Given, When, Then }) => {
      Given("Studio 0.1.0 with nothing newer released", () => {
        releases = new Releases(null);
        updates = createUpdates(releases);
      });
      When("the lecturer checks for a newer version", checks);
      Then("Studio shall say {string}", says);
    });
  });

  Rule("If this copy of Studio carries no update key, then the Studio shall point the lecturer to the download page instead of offering an update.", ({ RuleScenario }) => {
    RuleScenario("A copy built without the key", ({ Given, When, Then, And }) => {
      Given("a copy of Studio that can't update itself", () => {
        updates = createUpdates(noUpdates("0.1.0"));
      });
      When("the lecturer checks for a newer version", checks);
      Then("Studio shall link to {string}", (_, link: string) => {
        expect(found.offer.kind).toBe("unavailable");
        expect(found.link).toBe(link);
      });
      And("accepting shall install nothing", async () => expect((await updates.accept()).ok).toBe(false));
    });
  });

  Rule("When a lecturer accepts a newer Studio, the Studio shall download and install it, then restart.", ({ RuleScenario }) => {
    RuleScenario("Accepting 0.2.0", ({ Given, When, And, Then }) => {
      Given("Studio 0.1.0 with version {string} released", released);
      When("the lecturer checks for a newer version", checks);
      And("the lecturer accepts it", async () => expect((await updates.accept()).ok).toBe(true));
      Then("version {string} shall be installed and Studio restarted", (_, version: string) => {
        expect(releases.installed).toEqual([version]);
        expect(releases.restarted).toBe(true);
      });
    });
  });
  let preferences = sessionUpdatePreferences();
  let ready: ReadyUpdate | null = null;
  let answer: { ok: boolean; reason?: string } = { ok: true };
  const prepare = async (newest: string | null, options: { last?: string; tutors?: string; beta?: string; channel?: UpdateChannel } = {}) => {
    releases = new Releases(newest, options.tutors ?? null, options.beta ?? null);
    preferences = sessionUpdatePreferences();
    if (options.last) await preferences.lastCheck.set(options.last);
    if (options.channel) await preferences.channel.set(options.channel);
    ready = null;
  };
  const opens = async (_: unknown, at: string) => {
    updates = createUpdates(releases, preferences, () => new Date(at));
    ready = await updates.opening();
  };
  const neverChecked = (_: unknown, version: string, tutors: string) => prepare(version, { tutors });
  const nothingDone = () => {
    expect(releases.downloaded).toEqual([]);
    expect(releases.installed).toEqual([]);
  };
  const saysOnOpening = (_: unknown, words: string) => expect(ready?.words).toBe(words);

  Rule(
    "When Studio opens and a day has passed since it last asked for a newer version, the Studio shall ask for the latest version on the lecturer's channel and download nothing.",
    ({ RuleScenario }) => {
      RuleScenario("Opening a day after the last check", ({ Given, When, Then, And }) => {
        Given("Studio 0.1.0 last checked for a newer version {string}, with version {string} released", (_, last: string, version: string) => prepare(version, { last }));
        When("Studio opens at {string}", opens);
        Then("Studio shall have asked the {string} channel once", (_, channel: string) => expect(releases.checks).toEqual([channel]));
        And("nothing shall be downloaded or installed", nothingDone);
      });
      RuleScenario("Opening again the same day", ({ Given, When, Then }) => {
        Given("Studio 0.1.0 last checked for a newer version {string}, with version {string} released", (_, last: string, version: string) => prepare(version, { last }));
        When("Studio opens at {string}", opens);
        Then("Studio shall not have asked for a newer version", () => {
          expect(releases.checks).toEqual([]);
          expect(ready).toBeNull();
        });
      });
      RuleScenario("A lecturer on Beta", ({ Given, When, Then, And }) => {
        Given("Studio 0.1.0 on the Beta channel, with version {string} released and {string} on Beta", (_, version: string, beta: string) =>
          prepare(version, { beta, channel: "beta" }),
        );
        When("Studio opens at {string}", opens);
        Then("Studio shall have asked the {string} channel once", (_, channel: string) => expect(releases.checks).toEqual([channel]));
        And("Studio shall say on opening {string}", saysOnOpening);
      });
    },
  );

  Rule(
    "When Studio opens and finds a newer version, the Studio shall say on the start screen and the course home which Studio and which Tutors it holds, with Update now and Later.",
    ({ RuleScenario }) => {
      RuleScenario("Studio 0.3.0 with Tutors 17.2.0", ({ Given, When, Then }) => {
        Given("Studio 0.1.0 never checked, with version {string} released holding Tutors {string}", neverChecked);
        When("Studio opens at {string}", opens);
        Then("Studio shall say on opening {string}", saysOnOpening);
      });
    },
  );

  Rule("While a plan is being applied or a course is being saved or published, the Studio shall not install an update.", ({ RuleScenario }) => {
    RuleScenario("Update now pressed while the course is publishing", ({ Given, And, When, Then }) => {
      Given("Studio 0.1.0 never checked, with version {string} released holding Tutors {string}", neverChecked);
      And("Studio has opened at {string}", opens);
      When("the lecturer presses Update now while the course is publishing", async () => {
        let finish = () => {};
        const publishing = studioBusy.during(() => new Promise<void>((done) => (finish = done)));
        answer = await updates.accept();
        finish();
        await publishing;
      });
      Then("Studio shall say {string}", (_, words: string) => expect(answer).toEqual({ ok: false, reason: words }));
      And("nothing shall be downloaded or installed", nothingDone);
    });
  });

  Rule(
    "If an update's signature does not match the key in the app, then the Studio shall discard it, install nothing and say the update could not be checked.",
    ({ RuleScenario }) => {
      RuleScenario("A forged update", ({ Given, And, When, Then }) => {
        Given("Studio 0.1.0 never checked, with version {string} released holding Tutors {string}", neverChecked);
        And("the download's signature doesn't match the key in the app", () => void (releases.forged = true));
        And("Studio has opened at {string}", opens);
        When("the lecturer presses Update now", async () => {
          answer = await updates.accept();
        });
        Then("Studio shall say {string}", (_, words: string) => expect(answer).toMatchObject({ ok: false, reason: words }));
        And("nothing shall be installed", () => expect(releases.installed).toEqual([]));
        And("pressing Update now again shall install nothing", async () => {
          releases.forged = false;
          expect(await updates.accept()).toEqual({ ok: false, reason: "Check for a newer version first." });
          expect(releases.installed).toEqual([]);
        });
      });
    },
  );

  Rule(
    "Where the lecturer has turned on Keep Studio up to date, the Studio shall download a newer version in the background when it opens and install it when Studio closes.",
    ({ RuleScenario }) => {
      RuleScenario("Kept up to date", ({ Given, And, When, Then }) => {
        Given("Studio 0.1.0 never checked, with version {string} released holding Tutors {string}", neverChecked);
        And("the lecturer has turned on Keep Studio up to date", () => preferences.keepUpToDate.set(true));
        When("Studio opens at {string}", opens);
        Then("version {string} shall be downloaded and not yet installed", (_, version: string) => {
          expect(releases.downloaded).toEqual([version]);
          expect(releases.installed).toEqual([]);
        });
        When("Studio closes", () => updates.closing());
        Then("version {string} shall be installed without restarting", (_, version: string) => {
          expect(releases.installed).toEqual([version]);
          expect(releases.restarted).toBe(false);
        });
      });
      RuleScenario("Off, as it starts", ({ Given, When, And, Then }) => {
        Given("Studio 0.1.0 never checked, with version {string} released holding Tutors {string}", neverChecked);
        When("Studio opens at {string}", opens);
        And("Studio closes", () => updates.closing());
        Then("nothing shall be downloaded or installed", nothingDone);
      });
    },
  );
});
