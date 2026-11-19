// Starts the WebDriver for the desktop journeys and stops it after them (ADR 0047). On Windows that is
// Edge WebDriver itself (msedgedriver.exe, from TAURI_NATIVE_DRIVER or the PATH), told to drive the app's
// WebView2, with a verbose log at DRIVER_LOG so a session that doesn't start says why; tauri-driver only
// forwards to it. Elsewhere, tauri-driver.
import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";

export const DRIVER_PORT = 4444;
/** Where Edge WebDriver writes what it did, when DRIVER_LOG is set (CI prints it when a journey fails). */
export const DRIVER_LOG = process.env.DRIVER_LOG ?? "";

const listening = (port: number) =>
  new Promise<boolean>((done) => {
    const socket = connect(port, "127.0.0.1");
    socket.once("connect", () => (socket.end(), done(true)));
    socket.once("error", () => done(false));
  });

let driver: ChildProcess | undefined;

export async function setup(): Promise<void> {
  const native = process.env.TAURI_NATIVE_DRIVER;
  driver =
    process.platform === "win32"
      ? spawn(native ?? "msedgedriver", [`--port=${DRIVER_PORT}`, ...(DRIVER_LOG ? ["--verbose", `--log-path=${DRIVER_LOG}`] : [])], { stdio: "inherit" })
      : spawn("tauri-driver", native ? ["--native-driver", native] : [], { stdio: "inherit" });
  driver.once("error", (error) => console.error(`The WebDriver didn't start: ${error.message}`));
  for (let tries = 0; tries < 100; tries++) {
    if (await listening(DRIVER_PORT)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`The WebDriver isn't answering on port ${DRIVER_PORT}`);
}

export async function teardown(): Promise<void> {
  driver?.kill();
}
