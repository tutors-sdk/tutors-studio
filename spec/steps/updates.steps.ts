import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { UpdatesPort } from "../../src/application/ports/updates.ts";
import { createUpdates, type UpdateCheck } from "../../src/application/use-cases/updates.ts";
import { noUpdates } from "../../src/adapters/updates/none/no-updates.ts";

const feature = await loadFeature("spec/features/updates.feature");

/** The release page in memory: the newest version, and what was installed. */
class Releases implements UpdatesPort {
  installed: string[] = [];
  restarted = false;
  constructor(private readonly newest: string | null) {}
  version = async () => "0.1.0";
  check = async () => (this.newest === null ? { kind: "current" as const, version: "0.1.0" } : { kind: "newer" as const, version: this.newest, notes: "" });
  install = async () => {
    if (this.newest !== null) this.installed.push(this.newest);
    this.restarted = true;
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
});
