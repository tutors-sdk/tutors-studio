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
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: ["es2022", "safari16"],
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    include: ["tests/**/*.test.ts", "spec/steps/**/*.steps.ts"],
    environment: "node",
  },
});
