// S1: the smallest change that lets the reader build with SvelteKit's static adapter. Run in a checkout
// of tutors-mono-repo. It is the probe for upstream changes M1 and M2, not their implementation.
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const svelte = "packages/svelte/app-config/src/svelte.js";
let config = readFileSync(svelte, "utf8");
config = config.replace("import adapterNode from '@sveltejs/adapter-node';", "import adapterNode from '@sveltejs/adapter-node';\nimport adapterStatic from '@sveltejs/adapter-static';");
config = config.replace(
  "const adapter = process.env.SVELTEKIT_ADAPTER === 'node' ? adapterNode() : adapterAuto();",
  "const adapter = process.env.SVELTEKIT_ADAPTER === 'static' ? adapterStatic({ fallback: '200.html', strict: false }) : process.env.SVELTEKIT_ADAPTER === 'node' ? adapterNode() : adapterAuto();",
);
if (!config.includes("adapterStatic({")) throw new Error("svelte.js no longer has the adapter line this spike patches");
writeFileSync(svelte, config);

// The root load runs on a server (actor and locale). A static build has none, so the same shape comes from the browser.
rmSync("apps/reader/src/routes/+layout.server.ts");
const layout = "apps/reader/src/routes/+layout.ts";
writeFileSync(layout, `${readFileSync(layout, "utf8")}\nexport const load = () => ({ actor: null, loggedIn: false, user: undefined, locale: undefined });\n`);
console.log("patched", svelte, "and the reader's root load");
