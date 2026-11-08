/**
 * The hexagon's rings (ADR 0002). Domain imports nothing; application imports domain; each adapter imports
 * the application's ports, the domain and one external SDK; the UI calls use cases through the ports; only
 * the composition roots (src/main.ts for the app, src/headless.ts for the CLI) name adapters.
 */
module.exports = {
  forbidden: [
    {
      name: "domain-imports-nothing",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { pathNot: "^src/domain/" },
    },
    {
      name: "application-imports-only-domain",
      severity: "error",
      from: { path: "^src/application/" },
      to: { pathNot: "^src/(application|domain)/" },
    },
    {
      name: "adapters-never-import-ui-or-each-other",
      comment: "An adapter may import its port, the domain and its own SDK; never the UI, another adapter or the composition root.",
      severity: "error",
      from: { path: "^src/adapters/([^/]+/[^/]+)/" },
      to: { path: "^src/(ui/|(main|headless)\\.ts|adapters/)", pathNot: ["^src/adapters/$1/"] },
    },
    {
      name: "ui-never-imports-adapters",
      severity: "error",
      from: { path: "^src/ui/" },
      to: { path: "^src/(adapters/|(main|headless)\\.ts)" },
    },
    {
      name: "only-the-rules-adapter-imports-course-rules",
      comment: "ADR 0003: @tutors/course-rules and the tutors-create generator are reached only through CourseRulesPort.",
      severity: "error",
      from: { pathNot: "^(src/adapters/rules/course-rules/|vendor/)" },
      to: { path: "^vendor/" },
    },
    {
      name: "only-tauri-adapters-import-tauri",
      severity: "error",
      from: { pathNot: "^(src/adapters/[^/]+/tauri/|src/(main|headless)\\.ts)" },
      to: { path: "@tauri-apps/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    exclude: { path: "\\.svelte$" },
  },
};
