import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// @tutors/course-rules is vendored until it is on JSR (vendor/course-rules/VENDORED.md, ADR 0003).
const courseRules = fileURLToPath(new URL("./vendor/course-rules", import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  resolve: {
    alias: [
      { find: /^@tutors\/course-rules$/, replacement: `${courseRules}/src/mod.ts` },
      { find: /^@tutors\/course-rules\/deno\.json$/, replacement: `${courseRules}/deno.json` },
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
