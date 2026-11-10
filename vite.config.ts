import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// @tutors/course-rules and part of @tutors/tutors-create are vendored until they are on JSR
// (vendor/*/VENDORED.md, ADR 0003).
const courseRules = fileURLToPath(new URL("./vendor/course-rules", import.meta.url));
const tutorsCreate = fileURLToPath(new URL("./vendor/tutors-create", import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  resolve: {
    alias: [
      { find: /^@tutors\/course-rules$/, replacement: `${courseRules}/src/mod.ts` },
      { find: /^@tutors\/course-rules\/deno\.json$/, replacement: `${courseRules}/deno.json` },
      { find: /^@tutors\/course-rules\/quiz$/, replacement: `${courseRules}/src/quiz/mod.ts` },
      { find: /^@tutors\/tutors-create\/generate$/, replacement: `${tutorsCreate}/src/generate.ts` },
      { find: /^@tutors\/tutors-create\/import$/, replacement: `${tutorsCreate}/src/import-course.ts` },
    ],
  },
  // Tauri's own template: Rust's build output under src-tauri/target is locked while cargo runs, and on
  // Windows watching it fails with EBUSY. Cargo rebuilds the Rust side itself, so Vite never needs it.
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: ["es2022", "safari16"],
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    projects: [
      { extends: true, test: { name: "studio", include: ["tests/**/*.test.ts", "spec/steps/**/*.steps.ts"], exclude: ["tests/ui/**"], environment: "node" } },
      // The screens, mounted in a browser-like document; Svelte's browser build, not its server one.
      {
        extends: true,
        resolve: { conditions: ["browser"] },
        test: { name: "screens", include: ["tests/ui/**/*.test.ts"], environment: "jsdom", setupFiles: ["tests/ui/setup.ts"] },
      },
    ],
  },
});
