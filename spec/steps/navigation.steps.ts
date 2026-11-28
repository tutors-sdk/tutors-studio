import { readFileSync } from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { canGoBack, goBack, goHome, type Layer } from "../../src/ui/navigation.ts";

const feature = await loadFeature("spec/features/navigation.feature");

describeFeature(feature, ({ Rule }) => {
  /** The screens open over the start screen, in App.svelte's order: Settings, a pane, a week, the course. */
  let open: { settings: boolean; pane: boolean; week: boolean; course: boolean };
  const layers = (): Layer[] => [
    { open: open.settings, close: () => (open.settings = false) },
    { open: open.course && open.pane, close: () => (open.pane = false) },
    { open: open.course && open.week, close: () => (open.week = false) },
    { open: open.course, close: () => (open = { settings: false, pane: false, week: false, course: false }) },
  ];
  const deep = () => void (open = { settings: true, pane: true, week: true, course: true });
  const atStart = () => {
    expect(open).toEqual({ settings: false, pane: false, week: false, course: false });
    expect(canGoBack(layers())).toBe(false);
  };
  const GIVEN = "a course is open with a week chosen, Check open, and Settings open over it";

  Rule("The Studio shall show Back, which closes the screen on top as its own Close would, and Home, which returns to the start screen, on every screen.", ({ RuleScenario }) => {
    RuleScenario("Back from Settings over Check in a course", ({ Given, When, Then }) => {
      Given(GIVEN, deep);
      When("the lecturer presses Back", () => goBack(layers()));
      Then("only Settings is closed", () => expect(open).toEqual({ settings: false, pane: true, week: true, course: true }));
    });
    RuleScenario("Back, one screen at a time, to the start screen", ({ Given, When, Then }) => {
      Given(GIVEN, deep);
      When("the lecturer presses Back {int} times", (_, times: number) => {
        for (let i = 0; i < times; i++) goBack(layers());
      });
      Then("the start screen shows and Back can go no further", atStart);
    });
    RuleScenario("Home from anywhere", ({ Given, When, Then }) => {
      Given(GIVEN, deep);
      When("the lecturer presses Home", () => goHome(layers()));
      Then("the start screen shows and Back can go no further", atStart);
    });
  });

  Rule("The Studio's Tutors window shall show Back, one page back, and Home, the Tutors reader's home page, on every page.", ({ RuleScenario }) => {
    RuleScenario("Every page of the Tutors window starts with the bar", ({ Given, Then }) => {
      let script = "";
      Given("the script every page of the Tutors window starts with", () => {
        const rust = readFileSync("src-tauri/src/live.rs", "utf8");
        expect(rust).toContain(".initialization_script(NAV_SCRIPT)");
        script = /pub const NAV_SCRIPT: &str = "([\s\S]*?)";\r?\n/.exec(rust)?.[1].replace(/\\\r?\n/g, "") ?? "";
      });
      Then("it adds Back, which goes one page back, and Home, the reader's home page", () => {
        // Run it in a page: it adds the bar once, and its buttons go back and home.
        const clicks: Record<string, () => void> = {};
        let went = "";
        let backs = 0;
        /** A button as the script uses one: its label, then the one listener it adds. */
        const element = () => {
          const made = {
            style: {},
            textContent: "",
            setAttribute: () => {},
            appendChild: () => {},
            addEventListener: (_: string, go: () => void) => (clicks[made.textContent] = go),
          };
          return made;
        };
        const document = { body: { appendChild: () => {} }, getElementById: () => null, createElement: element };
        const location = {
          origin: "http://127.0.0.1:8200",
          set href(to: string) {
            went = to;
          },
        };
        new Function("document", "location", "history", "addEventListener", script)(document, location, { back: () => (backs += 1) }, () => {});
        clicks["← Back"]();
        clicks["Home"]();
        expect(backs).toBe(1);
        expect(went).toBe("http://127.0.0.1:8200/");
      });
    });
  });

  Rule("The Studio shall offer Your library on every screen.", ({ RuleScenario }) => {
    RuleScenario("The bar at the top of every screen", ({ Given, Then }) => {
      let bar = "";
      Given("the bar at the top of every screen, with a library", () => {
        const app = readFileSync("src/ui/App.svelte", "utf8");
        // The bar is the shell's first child, on every screen, and gets the library whenever Studio has one.
        const shell = app.slice(app.indexOf('<div class="shell"'));
        expect(shell.split("\n")[1].trim()).toMatch(/^<NavBar .*onLibrary=\{library && !libraryOpen \? openLibrary : undefined\} \/>$/);
        bar = readFileSync("src/ui/components/NavBar.svelte", "utf8");
      });
      Then("it shall offer {string}", (_, words: string) => expect(bar).toContain(`{#if onLibrary}<button class="library" onclick={onLibrary}>${words}</button>{/if}`));
    });
  });

  Rule(
    "When the lecturer closes the Studio's own window, the Studio shall quit, closing the Tutors window and stopping every course server and reader it started.",
    ({ RuleScenario }) => {
      RuleScenario("Closing Studio's window", ({ Given, Then, And }) => {
        let rust = "";
        Given("how the Studio's desktop side hears a window close", () => void (rust = readFileSync("src-tauri/src/lib.rs", "utf8")));
        Then("closing the Studio's own window quits the Studio", () => {
          expect(rust).toMatch(/\.on_window_event\(\|window, event\| \{\s*if ends_studio\(window\.label\(\), event\) \{\s*window\.app_handle\(\)\.exit\(0\);/);
          expect(rust).toContain('const STUDIO_WINDOW: &str = "main";');
        });
        And("quitting stops the course server, the reader and the library courses it serves", () => {
          const exit = rust.slice(rust.indexOf("tauri::RunEvent::Exit"));
          expect(exit).toContain("live::stop_all(&mut live)");
          expect(exit).toContain("library_tutors::stop_all(");
        });
      });
    },
  );
});
