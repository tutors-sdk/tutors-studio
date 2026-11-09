import { readFileSync } from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { MemorySecrets } from "../../src/adapters/secrets/memory/memory-secrets.ts";
import { LocalStorageSettings } from "../../src/adapters/settings/local-storage/local-storage-settings.ts";
import type { PreferencesPort } from "../../src/application/ports/preferences.ts";
import { createPreferences } from "../../src/application/use-cases/preferences.ts";
import { appearanceAttributes, stepTextSize } from "../../src/domain/appearance.ts";

const feature = await loadFeature("spec/features/settings.feature");
const css = readFileSync("src/ui/paper-tokens.css", "utf8");
/** The declarations of the first rule whose selector list includes `selector`. */
const ruleFor = (selector: string) => {
  const at = css.indexOf(`${selector}`);
  expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
  return css.slice(css.indexOf("{", at), css.indexOf("}", at));
};

/** A WebView's storage, kept between "restarts" of Studio. */
class Store {
  private readonly values = new Map<string, string>();
  getItem = (key: string) => this.values.get(key) ?? null;
  setItem = (key: string, value: string) => void this.values.set(key, value);
  dump = () => [...this.values.values()].join("\n");
}

describeFeature(feature, ({ Rule }) => {
  let store: Store;
  let secrets: MemorySecrets;
  let preferences: PreferencesPort;

  const open = () => createPreferences({ settings: new LocalStorageSettings(store), secrets });
  const fresh = () => {
    store = new Store();
    secrets = new MemorySecrets();
    preferences = open();
  };
  const marked = async (name: string, value: string, prefs = preferences) => expect(appearanceAttributes(await prefs.appearance())[`data-${name}`]).toBe(value);
  const change = async (patch: object) => preferences.setAppearance({ ...(await preferences.appearance()), ...patch });
  const given = "a lecturer whose Studio follows the computer's appearance";

  Rule("When a lecturer chooses light or dark in Settings, the Studio shall show every screen in that appearance and keep it the next time it opens.", ({ RuleScenario }) => {
    RuleScenario("Dark, and still dark after a restart", ({ Given, When, Then, And }) => {
      Given(given, fresh);
      When("the lecturer chooses dark in Settings", () => change({ theme: "dark" }));
      Then('the window shall be marked theme "dark"', () => marked("theme", "dark"));
      And('Studio opened again shall still be marked theme "dark"', () => marked("theme", "dark", open()));
    });
  });

  Rule(
    "While dyslexia mode is on, the Studio shall show text in a dyslexia-friendly font on a cream background with wider letter, word and line spacing and no italics.",
    ({ RuleScenario }) => {
      RuleScenario("Dyslexia mode with OpenDyslexic", ({ Given, When, Then, And }) => {
        Given(given, fresh);
        When("the lecturer turns on dyslexia mode", () => change({ dyslexia: true }));
        Then('the window shall be marked dyslexia "opendyslexic"', () => marked("dyslexia", "opendyslexic"));
        And("the stylesheet shall give that mode OpenDyslexic, a cream background, wider letter spacing, word spacing 0.16em and no italics", () => {
          const mode = ruleFor(':root[data-dyslexia="opendyslexic"],');
          expect(mode).toContain("--studio-letter-spacing: 0.12em");
          expect(mode).toContain("--studio-word-spacing: 0.16em");
          expect(mode).toContain("--studio-emphasis-style: normal");
          expect(mode).toContain("--ui-canvas: light-dark(#f5f0e3");
          const font = ruleFor(':root[data-dyslexia="opendyslexic"] {');
          expect(font).toContain("OpenDyslexic");
          expect(font).toContain("--studio-letter-spacing: 0.05em");
        });
      });
      RuleScenario("Dyslexia mode off", ({ Given, Then }) => {
        Given(given, fresh);
        Then('the window shall be marked dyslexia "off"', () => marked("dyslexia", "off"));
      });
    },
  );

  Rule("When a lecturer chooses a larger text size, the Studio shall enlarge text and controls together, up to twice their size.", ({ RuleScenario }) => {
    RuleScenario("Ctrl and plus, again and again", ({ Given, When, Then, And }) => {
      Given(given, fresh);
      When("the lecturer makes the text bigger {int} times", async (_, times: number) => {
        for (let n = 0; n < times; n++) await change({ textSize: stepTextSize((await preferences.appearance()).textSize, 1) });
      });
      Then('the window shall be marked text size "200"', () => marked("text-size", "200"));
      And("the stylesheet shall scale text and the sidebar by 2 at that size", () => {
        expect(ruleFor(':root[data-text-size="200"]')).toContain("--studio-scale: 2");
        expect(css).toContain("--font-body: calc(16px * var(--studio-scale)");
        expect(css).toContain("--studio-sidebar-width: calc(280px * var(--studio-scale))");
      });
    });
  });

  Rule("While high contrast is on, the Studio shall show black on white or white on black with solid borders and a thicker focus ring.", ({ RuleScenario }) => {
    RuleScenario("High contrast chosen", ({ Given, When, Then, And }) => {
      Given(given, fresh);
      When("the lecturer chooses high contrast", () => change({ contrast: "high" }));
      Then('the window shall be marked contrast "high"', () => marked("contrast", "high"));
      And("the stylesheet shall give that mode black and white ink and a 4px focus ring", () => {
        const mode = ruleFor(':root[data-contrast="high"]');
        expect(mode).toContain("--ui-ink: light-dark(#000000, #ffffff)");
        expect(mode).toContain("--studio-focus-width: 4px");
      });
    });
    RuleScenario("Standard contrast", ({ Given, Then }) => {
      Given(given, fresh);
      Then('the window shall be marked contrast "system"', () => marked("contrast", "system"));
    });
  });
});
