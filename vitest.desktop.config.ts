import { defineConfig } from "vitest/config";

// The desktop journeys (ADR 0047): the @desktop scenarios through the real window, one at a time, on a
// built app. `pnpm e2e:desktop`; Windows only for now.
export default defineConfig({
  test: {
    include: ["e2e/desktop/**/*.desktop.ts"],
    environment: "node",
    globalSetup: ["e2e/desktop/tauri-driver.ts"],
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 120_000,
  },
});
