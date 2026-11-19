/**
 * Builds the front door, Studio's one-page website (ADR 0054):
 *
 *   pnpm front-door [out folder] [--no-film]
 *
 * It copies site/ with Studio's own tokens, font and icon, and records the film (scripts/film.ts) into
 * film/. The Front door workflow publishes the folder to GitHub Pages. Out folder defaults to _site.
 */
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { film } from "./film.ts";

const root = resolve(import.meta.dirname, "..");

/** The tokens, with their font addresses made relative so the page works under any path. */
export function siteTokens(tokens: string): string {
  return tokens.replaceAll('url("/fonts/', 'url("fonts/');
}

export async function frontDoor(out: string, withFilm: boolean): Promise<void> {
  rmSync(out, { recursive: true, force: true });
  cpSync(join(root, "site"), out, { recursive: true });
  writeFileSync(join(out, "paper-tokens.css"), siteTokens(readFileSync(join(root, "src/ui/paper-tokens.css"), "utf8")));
  mkdirSync(join(out, "fonts"), { recursive: true });
  for (const font of ["Inter-Variable.woff2", "Inter-OFL.txt"]) copyFileSync(join(root, "public/fonts", font), join(out, "fonts", font));
  copyFileSync(join(root, "src-tauri/icons/128x128.png"), join(out, "icon.png"));
  if (withFilm) await film(join(out, "film"));
}

if (import.meta.url === `file://${resolve(process.argv[1] ?? "")}`) {
  const args = process.argv.slice(2);
  const out = resolve(args.find((arg) => !arg.startsWith("--")) ?? "_site");
  await frontDoor(out, !args.includes("--no-film"));
  console.log(`The front door is in ${out}.`);
}
