// The Studio window, driven through Edge WebDriver on Windows and tauri-driver elsewhere (ADR 0047): a session on the built app, and the few
// ways a lecturer reaches things, by what they read on the screen.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { remote } from "webdriverio";
import { DRIVER_PORT } from "./tauri-driver.ts";

export type Window = Awaited<ReturnType<typeof remote>>;

/** The app the journeys open: STUDIO_APP, or the debug build CI makes with the tools and reader beside it. */
export const APP = resolve(process.env.STUDIO_APP ?? `src-tauri/target/debug/tutors-studio${process.platform === "win32" ? ".exe" : ""}`);

/**
 * The proxy the window sends every address but this computer's to (STUDIO_WINDOW_PROXY). It goes to the
 * WebView as a browser argument through the driver, which sets WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
 * itself; setting that variable by hand stops the driver reaching the window.
 */
export const WINDOW_PROXY = process.env.STUDIO_WINDOW_PROXY ?? "";
const WINDOW_ARGS = WINDOW_PROXY === "" ? [] : [`--proxy-server=${WINDOW_PROXY}`];

export async function openStudio(): Promise<Window> {
  if (!existsSync(APP)) throw new Error(`No Studio app at ${APP}. Build it first (see docs/testing.md).`);
  const studio = await remote({
    hostname: "127.0.0.1",
    port: DRIVER_PORT,
    logLevel: "warn",
    capabilities: (process.platform === "win32"
      ? // What tauri-driver sends Edge WebDriver for a tauri:options session: the app as a WebView2 "browser".
        { browserName: "webview2", "ms:edgeOptions": { binary: APP, args: WINDOW_ARGS }, "wdio:enforceWebDriverClassic": true }
      : { "tauri:options": { application: APP, args: WINDOW_ARGS }, "wdio:enforceWebDriverClassic": true }) as WebdriverIO.Capabilities,
  });
  await studio.waitUntil(async () => (await studio.$(button("Start a new course")).isExisting()) || (await studio.$(button("Your courses")).isExisting()), {
    timeout: 60_000,
    timeoutMsg: "Studio's start screen didn't appear",
  });
  return studio;
}

const quoted = (text: string) => (text.includes('"') ? `'${text}'` : `"${text}"`);

/** A button by the words on it. */
export const button = (name: string) => `//button[normalize-space(.)=${quoted(name)}]`;

/** A choice (radio button) by the start of its label. */
export const choice = (label: string) => `//label[starts-with(normalize-space(.), ${quoted(label)})]//input[@type="radio"]`;

/** A checkbox by the words beside it. */
export const checkbox = (label: string) => `//label[contains(normalize-space(.), ${quoted(label)})]//input[@type="checkbox"]`;

export async function press(studio: Window, name: string, timeout = 30_000): Promise<void> {
  const target = await studio.$(button(name));
  await target.waitForClickable({ timeout, timeoutMsg: `No "${name}" to press` });
  await target.click();
}

/**
 * The folder the lecturer would pick in the system's folder chooser, which WebDriver can't reach: the
 * window's next folder choices answer with this folder instead.
 */
export async function choosesFolder(studio: Window, folder: string): Promise<void> {
  await studio.execute((path: string) => {
    const internals = (globalThis as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown, options?: unknown) => Promise<unknown>; studioInvoke?: unknown } })
      .__TAURI_INTERNALS__;
    const real = (internals.studioInvoke ??= internals.invoke) as typeof internals.invoke;
    internals.invoke = (cmd, args, options) => (cmd === "plugin:dialog|open" ? Promise.resolve(path) : real(cmd, args, options));
  }, folder);
}

/** Waits for something on disk or on the screen, failing with the lecturer's view of what didn't happen. */
export async function eventually(studio: Window, check: () => Promise<boolean> | boolean, what: string, timeout = 120_000): Promise<void> {
  await studio.waitUntil(async () => await check(), { timeout, interval: 500, timeoutMsg: what });
}
