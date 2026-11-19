import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect } from "vitest";
import { memoryCommandLine } from "../../src/adapters/command-line/memory/memory-command-line.ts";
import type { CommandLineAdded, CommandLinePort } from "../../src/application/ports/command-line.ts";
import { commandLineWords } from "../../src/domain/command-line.ts";
import { bundleStudioCli } from "../../scripts/bundle.ts";

const feature = await loadFeature("spec/features/command-line.feature");

type Ran = { status: number | null; stdout: string };
const run = (program: string[], args: string[]): Ran => {
  const ran = spawnSync(process.execPath, [...program, ...args], { encoding: "utf8", env: { ...process.env, STUDIO_CONFIG_DIR: mkdtempSync(join(tmpdir(), "studio-config-")) } });
  return { status: ran.status, stdout: ran.stdout };
};

describeFeature(feature, ({ Rule }) => {
  let course = "";
  let bundled = "";
  let ran: Ran;
  let port: CommandLinePort;
  let said = "";

  Rule(
    "The Studio shall carry its command line in the tools program, answering `studio <course folder> <command>` as pnpm headless answers `<course folder> <command>`.",
    ({ RuleScenario }) => {
      RuleScenario("The bundled command line checks a course", ({ Given, When, Then, And }) => {
        Given("a course on disk with a talk folder named {string}", (_, talk: string) => {
          course = mkdtempSync(join(tmpdir(), "studio-cli-course-"));
          const files = { "course.md": "# C\n", "topic-01/topic.md": "# W\n", [`topic-01/${talk}/talk.md`]: "# T\n", [`topic-01/${talk}/slides.pdf`]: "%PDF" };
          for (const [path, text] of Object.entries(files)) {
            mkdirSync(dirname(join(course, path)), { recursive: true });
            writeFileSync(join(course, path), text);
          }
        });
        When("Studio's command line is bundled for the tools program", async () => {
          bundled = join(mkdtempSync(join(tmpdir(), "studio-cli-")), "studio.mjs");
          await bundleStudioCli(bundled);
        });
        And("the lecturer runs it with {string}", (_, command: string) => {
          ran = run([bundled], [course, command]);
        });
        Then("it answers as pnpm headless answers {string}", (_, command: string) => {
          const headless = run(["--import", "tsx", "src/headless.ts"], [course, command]);
          expect(ran.stdout).toContain("talk-01 Intro");
          expect(ran).toEqual(headless);
        });
      });
    },
  );

  Rule(
    'When the lecturer presses "Add the command line to this computer", the Studio shall add a tutors-studio command for any terminal and say where it is and whether a terminal finds it.',
    ({ RuleScenario }) => {
      const adds = (answer: CommandLineAdded) => () => {
        port = memoryCommandLine(answer);
      };
      const press = async () => {
        said = commandLineWords(await port.add());
      };
      const says = (_: unknown, words: string) => expect(said).toBe(words);

      RuleScenario("Added where a terminal finds it", ({ Given, When, Then }) => {
        Given("this computer adds the command as {string}, in a folder on its path", (_, command: string) => adds({ kind: "added", command, on_path: true })());
        When("the lecturer adds the command line to this computer", press);
        Then("Studio says {string}", says);
      });
      RuleScenario("Added in a folder that isn't on the path", ({ Given, When, Then }) => {
        Given("this computer adds the command as {string}, in a folder not on its path", (_, command: string) => adds({ kind: "added", command, on_path: false })());
        When("the lecturer adds the command line to this computer", press);
        Then("Studio says {string}", says);
      });
      RuleScenario("A copy of Studio without its command line", ({ Given, When, Then }) => {
        Given(
          "this copy of Studio doesn't carry its command line",
          adds({ kind: "not-here", reason: "This copy of Studio doesn't carry its command line. Install Studio from its installer to add it." }),
        );
        When("the lecturer adds the command line to this computer", press);
        Then("Studio says {string}", says);
      });
    },
  );
});
