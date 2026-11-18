// S1: opens a course in the static reader with the Edge that ships on Windows (the engine WebView2 uses)
// and records every request that fails. Copied into the tutors-mono-repo checkout so `playwright` resolves.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const [, , readerOrigin, courseHost, out] = process.argv;
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const failed = [];
const bad = [];
const api = [];
const errors = [];
page.on("requestfailed", (request) => failed.push(`${request.method()} ${request.url()} (${request.failure()?.errorText})`));
page.on("response", (response) => {
  if (response.status() >= 400) bad.push(`${response.status()} ${response.request().method()} ${response.url()}`);
});
page.on("request", (request) => {
  const path = new URL(request.url()).pathname;
  if (request.url().startsWith(readerOrigin) && (path.startsWith("/api/") || path.includes("__data.json") || ["/healthz", "/version", "/metrics"].includes(path))) api.push(`${request.method()} ${path}`);
});
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text().slice(0, 300));
});
page.on("pageerror", (error) => errors.push(`pageerror: ${String(error).slice(0, 300)}`));

const visited = [];
async function visit(url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch((error) => errors.push(`goto ${url}: ${error.message.slice(0, 200)}`));
  await page.waitForTimeout(3000);
  const text = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
  visited.push({ url, title: await page.title(), text });
}
await visit(`${readerOrigin}/course/${courseHost}`);
await page.screenshot({ path: `${out}/course.png`, fullPage: true });
// Follow the first few links inside the course so a topic, a lab or a talk is opened too.
const links = await page.locator("a[href]").evaluateAll((anchors) => [...new Set(anchors.map((a) => a.getAttribute("href")))].filter((href) => /^\/(topic|lab|talk|note)\//.test(href ?? "")).slice(0, 4));
for (const [index, href] of links.entries()) {
  await visit(`${readerOrigin}${href}`);
  await page.screenshot({ path: `${out}/page-${index + 1}.png`, fullPage: true });
}
await browser.close();

const list = (items) => (items.length === 0 ? "None.\n" : `${[...new Set(items)].map((item) => `- \`${item}\``).join("\n")}\n`);
const report = [
  "### S1: the static reader, opened in Edge",
  "",
  "| Page | Title | First words |",
  "| --- | --- | --- |",
  ...visited.map((v) => `| \`${v.url}\` | ${v.title} | ${v.text.slice(0, 160).replaceAll("|", "/")} |`),
  "",
  "**Requests to the reader's own server routes** (these need a server; a static build has none):",
  "",
  list(api),
  "**Requests that failed:**",
  "",
  list(failed),
  "**Responses of 400 and above:**",
  "",
  list(bad),
  "**Console errors:**",
  "",
  list(errors),
].join("\n");
writeFileSync(`${out}/report.md`, report);
console.log(report);
