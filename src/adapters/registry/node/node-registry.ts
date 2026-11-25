import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { RegistryPort } from "../../../application/ports/registry.ts";

/** A path inside a registry folder, refusing anything that would leave it. */
function inside(folder: string, path: string): string {
  const root = resolve(folder);
  const full = resolve(root, path.replaceAll("\\", "/"));
  if (full === root || !full.startsWith(root + sep)) throw new Error(`${path}: outside the registry folder`);
  return full;
}

/** Writes only into a folder that is a registry, or the registry.json that starts one (ADR 0063). */
async function guarded(folder: string, path: string): Promise<string> {
  const full = inside(folder, path);
  if (path !== "registry.json")
    await access(inside(folder, "registry.json")).catch(() => {
      throw new Error(`${folder}: not a registry`);
    });
  return full;
}

/** Folder registries on the local disk through node:fs: the headless CLI's adapter (ADR 0063). */
export const nodeRegistry: RegistryPort = {
  async write(folder, path, bytes) {
    const full = await guarded(folder, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, bytes);
  },
  async remove(folder, path) {
    await rm(await guarded(folder, path));
  },
};
