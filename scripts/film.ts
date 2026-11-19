/**
 * Records the front door's film: Web Development II built in Studio's browser preview, following
 * docs/guides/web-development-2-walkthrough.md (ADR 0054). Run by `pnpm front-door`, or alone:
 *
 *   pnpm film <out folder>
 *
 * It writes web-development-2.webm, and web-development-2.mp4 and poster.jpg when ffmpeg is on the path.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { createServer } from "vite";

const size = { width: 1280, height: 800 };

/** What the film says on screen, in order. Each line is one step of the walkthrough. */
export const captions = [
  "Tutors Studio: a course built in about a minute and a half.",
  "Start a new course, and give it a name.",
  "Start from a reference course: Web Development II, eight weeks of lectures and labs.",
  "Studio shows the course the way Tutors will publish it, and it already passes Tutors' checks.",
  "Open a week, and drop the lecture slides onto it. Each PDF becomes a lecture card.",
  "Changed your mind? Put it back.",
  "Write the week's page the way you would in a word processor.",
  "Every change is kept in Changes, and can be undone.",
  "Check and publish says what is missing, in your words, and fixes what is safe to fix.",
  "Download Studio for your computer. Nothing else to install.",
] as const;

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

async function caption(page: Page, text: string): Promise<void> {
  await page.evaluate((said) => {
    let box = document.getElementById("film-caption");
    if (!box) {
      box = document.createElement("div");
      box.id = "film-caption";
      box.setAttribute("aria-hidden", "true");
      Object.assign(box.style, {
        position: "fixed",
        left: "50%",
        bottom: "var(--space-6)",
        transform: "translateX(-50%)",
        maxWidth: "760px",
        padding: "var(--space-3) var(--space-5)",
        borderRadius: "var(--radius-card)",
        background: "var(--ink)",
        color: "var(--surface)",
        font: "var(--weight-medium) var(--font-section)/var(--leading-ui) var(--studio-font-stack)",
        textAlign: "center",
        zIndex: "2147483647",
        pointerEvents: "none",
      });
      document.body.append(box);
    }
    box.textContent = said;
  }, text);
}

async function typeSlowly(page: Page, selector: string, text: string): Promise<void> {
  await page.locator(selector).click();
  await page.keyboard.type(text, { delay: 70 });
}

const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });

/** The walkthrough, at a pace a lecturer can follow. About ninety seconds. */
async function walkthrough(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByRole("button", { name: "Start a new course" }).waitFor();
  await caption(page, captions[0]);
  await pause(page, 5000);

  await caption(page, captions[1]);
  await page.getByRole("button", { name: "Start a new course" }).click();
  await pause(page, 1200);
  await typeSlowly(page, "#name", "Web Development II");
  await pause(page, 1500);
  await page.getByRole("button", { name: "Continue" }).click();

  await caption(page, captions[2]);
  await pause(page, 1500);
  await page.locator("#example").selectOption("web-dev-2");
  await pause(page, 6000);
  await page.getByRole("button", { name: "Create course" }).click();

  await caption(page, captions[3]);
  await page.getByText("Everything checks out.").waitFor();
  await pause(page, 8000);
  // The helper has said its piece; out of the way so the captions stay clear.
  await page.getByRole("button", { name: "Not now" }).click();

  await caption(page, captions[4]);
  await page.getByRole("button", { name: "1: Introducing Javascript", exact: true }).click();
  await pause(page, 3000);
  await page.locator("input[type=file][multiple]").setInputFiles([pdf("review.pdf"), pdf("js-background.pdf")]);
  await pause(page, 6000);

  const putBack = page.getByRole("button", { name: "Put it back" });
  if (await putBack.isVisible()) {
    await caption(page, captions[5]);
    await pause(page, 3500);
  }

  await caption(page, captions[6]);
  await page.getByRole("button", { name: "Write", exact: true }).last().click();
  const editor = page.locator(".ProseMirror");
  await editor.waitFor();
  await pause(page, 1500);
  await editor.locator("p").last().click({ clickCount: 3 });
  await page.keyboard.type("Why JavaScript, where it runs, and your first program in the browser and in Node.", { delay: 45 });
  await pause(page, 1500);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await pause(page, 2500);
  await page.getByRole("button", { name: "Save the page", exact: true }).click();
  await pause(page, 4000);

  await caption(page, captions[7]);
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  await pause(page, 7000);

  await caption(page, captions[8]);
  await page.getByRole("button", { name: "Check and publish", exact: true }).click();
  await pause(page, 9000);

  await endCard(page, captions[9]);
  await pause(page, 7000);
}

/** The last frames: the name and the one thing to do next, over the course just made. */
async function endCard(page: Page, text: string): Promise<void> {
  await page.evaluate((said) => {
    document.getElementById("film-caption")?.remove();
    const card = document.createElement("div");
    card.setAttribute("aria-hidden", "true");
    Object.assign(card.style, {
      position: "fixed",
      inset: "0",
      display: "grid",
      placeContent: "center",
      gap: "var(--space-4)",
      textAlign: "center",
      background: "var(--canvas)",
      color: "var(--ink)",
      fontFamily: "var(--studio-font-stack)",
      zIndex: "2147483647",
    });
    const name = document.createElement("div");
    name.textContent = "Tutors Studio";
    Object.assign(name.style, { fontSize: "var(--font-display)", fontWeight: "var(--weight-semibold)", color: "var(--brand)" });
    const line = document.createElement("div");
    line.textContent = said;
    Object.assign(line.style, { fontSize: "var(--font-heading)" });
    card.append(name, line);
    document.body.append(card);
  }, text);
}

export async function film(out: string): Promise<void> {
  mkdirSync(out, { recursive: true });
  const raw = join(out, ".raw");
  rmSync(raw, { recursive: true, force: true });
  const server = await createServer({ server: { port: 1421, strictPort: false }, logLevel: "warn" });
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("The browser preview did not start.");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: size, recordVideo: { dir: raw, size }, colorScheme: "light", reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await walkthrough(page, url);
    await context.close();
    if (errors.length > 0) throw new Error(`The preview failed while filming:\n${errors.join("\n")}`);
  } finally {
    await browser.close();
    await server.close();
  }
  const [recorded] = readdirSync(raw).filter((name) => name.endsWith(".webm"));
  if (!recorded) throw new Error("Playwright saved no video.");
  const webm = join(out, "web-development-2.webm");
  renameSync(join(raw, recorded), webm);
  rmSync(raw, { recursive: true, force: true });
  if (hasFfmpeg()) {
    const ffmpeg = (...args: string[]) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
    ffmpeg("-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-movflags", "+faststart", "-an", join(out, "web-development-2.mp4"));
    ffmpeg("-ss", "21", "-i", webm, "-frames:v", "1", "-q:v", "3", join(out, "poster.jpg"));
  }
}

function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (import.meta.url === `file://${resolve(process.argv[1] ?? "")}`) {
  const out = process.argv[2];
  if (!out) {
    console.error("Usage: pnpm film <out folder>");
    process.exit(2);
  }
  await film(resolve(out));
  console.log(`The film is in ${resolve(out)}.`);
}
