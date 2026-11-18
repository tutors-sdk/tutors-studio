// The window half of the bundle journeys (ADR 0047): each @desktop Rule in spec/features/journeys.feature,
// through the real Studio window on Windows, built with the Tutors tools and reader beside it. The headless
// half is spec/steps/journeys.steps.ts, with the same words.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { button, checkbox, choice, choosesFolder, eventually, openStudio, press, WINDOW_PROXY, type Window } from "./window.ts";

const feature = await loadFeature("spec/features/journeys.feature");
/** Each scenario works in a folder of its own, as a lecturer's computer would hold one course of that name. */
const freshFolder = () => mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), "studio-journeys-"));
let root = freshFolder();

/** The course's own folder name, as Studio makes it from the name. */
const folderFor = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

describeFeature(feature, ({ Rule, AfterEachScenario }) => {
  let window: Window | undefined;
  let course = "";
  const parentOf = (place: string) => join(root, place);

  AfterEachScenario(async () => {
    await window?.deleteSession();
    window = undefined;
  });

  const onlyStudio = () => {
    root = freshFolder();
    // Nothing that could build a course is on this computer but Studio and its Tutors tools.
    expect(spawnSync("deno", ["--version"]).error, "Deno must not be on the PATH for the journeys").toBeDefined();
  };

  const makes = async (_: unknown, name: string, template: string, place: string) => {
    const parent = parentOf(place);
    mkdirSync(parent, { recursive: true });
    window = await openStudio();
    await choosesFolder(window, parent);
    await press(window, "Start a new course");
    await (await window.$("#name")).setValue(name);
    await press(window, "Continue");
    await (await window.$(choice(template))).click();
    await press(window, "Create course");
    course = join(parent, folderFor(name));
    await eventually(window, () => existsSync(join(course, "course.md")), `Studio didn't make ${course}`);
  };

  const toPublish = async () => {
    await press(window!, "Check and publish");
    await press(window!, "Preview and publish");
  };

  const saves = async () => {
    await toPublish();
    await press(window!, "Save the course");
    await eventually(window!, () => existsSync(join(course, "netlify.toml")), "Studio didn't save the course with its setup");
  };

  const onlyTheTools = () => {
    // The journey built the course with the tools beside Studio: their output is there, and no Deno ran.
    expect(existsSync(join(course, "json")) || existsSync(join(course, "html"))).toBe(true);
  };

  Rule(
    "When a lecturer makes a new course on a computer with nothing but Studio installed, the Studio shall save it with the setup Tutors expects and build it with the Tutors tools inside Studio.",
    ({ RuleScenario }) => {
      RuleScenario("From a new course to the course in Tutors", ({ Given, When, And, Then }) => {
        Given("a computer with only Studio on it", onlyStudio);
        When("the lecturer makes a new course {string} from {string} in {string}", makes);
        And("the lecturer saves the course", saves);
        Then("the course folder holds {string}", (_, file: string) => expect(existsSync(join(course, file))).toBe(true));
        When("the lecturer shows the course in Tutors", async () => {
          await press(window!, "Show it in Tutors");
          await eventually(window!, async () => await window!.$(button("Stop")).isExisting(), "Studio didn't show the course in Tutors", 180_000);
        });
        Then("Tutors shows {string}", async (_, title: string) => {
          // The reader inside Studio answers on 8200, and the course it reads is served from 8190 on.
          const reader = await fetch("http://127.0.0.1:8200/");
          expect(reader.status).toBe(200);
          expect(await reader.text()).toMatch(/<html/i);
          let served = "";
          for (let port = 8190; port < 8200 && served === ""; port++) {
            const answer = await fetch(`http://127.0.0.1:${port}/tutors.json`).catch(() => null);
            if (answer?.ok) served = await answer.text();
          }
          expect(served).toContain(title);
        });
        And("Studio ran no tool but the Tutors tools", onlyTheTools);
      });
    },
  );

  Rule(
    "When a lecturer saves a course as a website on a computer with no network, the Studio shall build it with the Tutors tools inside Studio and save it as a folder of web pages.",
    ({ RuleScenario }) => {
      RuleScenario("A website saved with the network off", ({ Given, And, When, Then }) => {
        let offline = false;
        Given("a computer with only Studio on it", onlyStudio);
        And("no network", () => {
          // The journeys run with every address but this computer's sent to a proxy that isn't there (ADR 0047).
          offline = WINDOW_PROXY !== "" && (process.env.HTTPS_PROXY ?? "") !== "";
          expect(offline, "run the journeys with the network off (see docs/testing.md)").toBe(true);
        });
        When("the lecturer makes a new course {string} from {string} in {string}", async (...args: [unknown, string, string, string]) => {
          await makes(...args);
          // The window can't reach the internet either.
          const reached = await window!.executeAsync((done: (ok: boolean) => void) => {
            fetch("https://github.com/", { mode: "no-cors" }).then(
              () => done(true),
              () => done(false),
            );
          });
          expect(reached && offline, "the window reached the internet").toBe(false);
        });
        And("the lecturer saves the course as a website in {string}", async (_, place: string) => {
          // Save as a website is in Advanced mode (STU-0116).
          await press(window!, "Settings");
          const advanced = await window!.$(checkbox("Advanced mode"));
          if (!(await advanced.isSelected())) await advanced.click();
          await press(window!, "Done");
          await choosesFolder(window!, parentOf(place));
          await toPublish();
          await press(window!, "Save as a website…");
        });
        Then("{string} holds {string}", async (_, saved: string, file: string) => {
          await eventually(window!, () => existsSync(join(root, saved, file)), `Studio didn't save ${saved}/${file}`, 180_000);
        });
        And("Studio ran no tool but the Tutors tools", onlyTheTools);
      });
    },
  );
});
