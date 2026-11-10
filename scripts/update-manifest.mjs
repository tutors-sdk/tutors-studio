// Writes latest.json, the manifest a running Studio's updater reads (ADR 0033), from the signed updates
// the release workflow built, and copies the macOS update beside the installers so it is released too.
// node scripts/update-manifest.mjs <version> <download base URL> <updates folder> <release folder>
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Each computer the updater asks for, and the released file it installs. */
export const UPDATES = [
  { platforms: ["darwin-aarch64", "darwin-x86_64"], file: "Tutors-Studio-macOS.app.tar.gz" },
  { platforms: ["windows-x86_64"], file: "Tutors-Studio-Windows-setup.exe" },
  { platforms: ["linux-x86_64"], file: "Tutors-Studio-Linux.AppImage" },
];

export function manifest(version, base, signatureOf, now = new Date()) {
  const platforms = {};
  for (const { platforms: names, file } of UPDATES) {
    const signature = signatureOf(file);
    if (signature === null) throw new Error(`no signature for ${file}: was the update key set for every build?`);
    for (const name of names) platforms[name] = { signature, url: `${base}/${file}` };
  }
  return { version, notes: `Tutors Studio ${version}. See the release page for what changed.`, pub_date: now.toISOString(), platforms };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [version, base, updates, release] = process.argv.slice(2);
  const signatureOf = (file) => {
    const path = join(updates, `${file}.sig`);
    return existsSync(path) ? readFileSync(path, "utf8").trim() : null;
  };
  writeFileSync(join(release, "latest.json"), `${JSON.stringify(manifest(version, base, signatureOf), null, 2)}\n`);
  copyFileSync(join(updates, "Tutors-Studio-macOS.app.tar.gz"), join(release, "Tutors-Studio-macOS.app.tar.gz"));
  console.log(readFileSync(join(release, "latest.json"), "utf8"));
}
