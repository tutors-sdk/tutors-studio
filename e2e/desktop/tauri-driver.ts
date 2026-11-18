// Starts tauri-driver for the desktop journeys and stops it after them (ADR 0047). tauri-driver drives
// the Studio window through Edge WebDriver on Windows; TAURI_NATIVE_DRIVER names msedgedriver.exe when
// it isn't on the PATH.
import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";

export const DRIVER_PORT = 4444;

const listening = (port: number) =>
  new Promise<boolean>((done) => {
    const socket = connect(port, "127.0.0.1");
    socket.once("connect", () => (socket.end(), done(true)));
    socket.once("error", () => done(false));
  });

let driver: ChildProcess | undefined;

export async function setup(): Promise<void> {
  const native = process.env.TAURI_NATIVE_DRIVER;
  driver = spawn("tauri-driver", native ? ["--native-driver", native] : [], { stdio: "inherit" });
  driver.once("error", (error) => console.error(`tauri-driver didn't start: ${error.message}`));
  for (let tries = 0; tries < 100; tries++) {
    if (await listening(DRIVER_PORT)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`tauri-driver isn't answering on port ${DRIVER_PORT}`);
}

export async function teardown(): Promise<void> {
  driver?.kill();
}
