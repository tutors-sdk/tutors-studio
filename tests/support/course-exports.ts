import { gzipSync, strToU8, zipSync } from "fflate";

/**
 * Small course exports for the loading scenarios (STU-0222, STU-0223): a Moodle backup (.mbz, a gzipped tar)
 * and an IMS Common Cartridge (.imscc, a zip), in the shape Moodle 4 and Canvas write them.
 */
type Files = Record<string, string>;
const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** A ustar tar of the files, gzipped. */
function tgz(files: Files): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const [name, value] of Object.entries(files)) {
    const data = strToU8(value);
    const header = new Uint8Array(512);
    header.set(strToU8(name.slice(0, 100)), 0);
    header.set(strToU8("0000644\0"), 100);
    header.set(strToU8(data.byteLength.toString(8).padStart(11, "0") + "\0"), 124);
    header.set(strToU8("        "), 148);
    header[156] = "0".charCodeAt(0);
    header.set(strToU8("ustar\x0000"), 257);
    header.set(
      strToU8(
        header
          .reduce((sum, byte) => sum + byte, 0)
          .toString(8)
          .padStart(6, "0") + "\0 ",
      ),
      148,
    );
    const body = new Uint8Array(Math.ceil(data.byteLength / 512) * 512);
    body.set(data);
    blocks.push(header, body);
  }
  blocks.push(new Uint8Array(1024));
  const all = new Uint8Array(blocks.reduce((n, block) => n + block.byteLength, 0));
  blocks.reduce((at, block) => (all.set(block, at), at + block.byteLength), 0);
  return gzipSync(all);
}

export type MoodleThing = { resource: string; file: string } | { url: string; href: string } | { page: string; html: string } | { forum: string };

/** A Moodle course backup: section 0 (General) first, then one section per week. */
export function moodleBackup(sections: { title: string; things: MoodleThing[] }[]): Uint8Array {
  const files: Files = {};
  const fileRows: string[] = [];
  const sectionRows: string[] = [];
  const activityRows: string[] = [];
  let id = 100;
  sections.forEach((section, number) => {
    const sectionId = String(500 + number);
    sectionRows.push(`<section><sectionid>${sectionId}</sectionid><title>${xml(section.title)}</title></section>`);
    for (const thing of section.things) {
      const [kind, title] = Object.entries(thing)[0] as [string, string];
      const dir = `activities/${kind}_${++id}`;
      activityRows.push(`<activity><sectionid>${sectionId}</sectionid><modulename>${kind}</modulename><title>${xml(title)}</title><directory>${dir}</directory></activity>`);
      if ("file" in thing) {
        const hash = id.toString(16).padStart(40, "0");
        files[`files/${hash.slice(0, 2)}/${hash}`] = thing.file.endsWith(".pdf") ? "%PDF-1.4" : thing.file;
        fileRows.push(`<file id="${id}"><contenthash>${hash}</contenthash><filepath>/</filepath><filename>${xml(thing.file)}</filename></file>`);
        files[`${dir}/inforef.xml`] = `<inforef><fileref><file><id>${id}</id></file></fileref></inforef>`;
      }
      if ("href" in thing) files[`${dir}/url.xml`] = `<activity><url><externalurl>${xml(thing.href)}</externalurl></url></activity>`;
      if ("html" in thing) files[`${dir}/page.xml`] = `<activity><page><content>${xml(thing.html)}</content></page></activity>`;
    }
  });
  files["moodle_backup.xml"] =
    `<?xml version="1.0" encoding="UTF-8"?>\n<moodle_backup><information><contents>` +
    `<activities>${activityRows.join("")}</activities><sections>${sectionRows.join("")}</sections></contents></information></moodle_backup>`;
  files["files.xml"] = `<?xml version="1.0" encoding="UTF-8"?>\n<files>${fileRows.join("")}</files>`;
  return tgz(files);
}

export type CartridgeThing = { file: string } | { link: string; href: string } | { page: string; html: string };

/** An IMS Common Cartridge as Canvas exports it: one root item wrapping one item per module. */
export function cartridge(modules: { title: string; things: CartridgeThing[] }[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const resources: string[] = [];
  let n = 0;
  const items = modules.map((module) => {
    const inner = module.things.map((thing) => {
      const id = `r${++n}`;
      let title: string;
      if ("file" in thing) {
        title = thing.file;
        files[`web_resources/${thing.file}`] = strToU8(thing.file.endsWith(".pdf") ? "%PDF-1.4" : thing.file);
        resources.push(`<resource identifier="${id}" type="webcontent" href="web_resources/${xml(thing.file)}"><file href="web_resources/${xml(thing.file)}"/></resource>`);
      } else if ("link" in thing) {
        title = thing.link;
        files[`${id}.xml`] = strToU8(`<webLink><title>${xml(thing.link)}</title><url href="${xml(thing.href)}"/></webLink>`);
        resources.push(`<resource identifier="${id}" type="imswl_xmlv1p1"><file href="${id}.xml"/></resource>`);
      } else {
        title = thing.page;
        files[`wiki_content/${id}.html`] = strToU8(thing.html);
        resources.push(`<resource identifier="${id}" type="webcontent" href="wiki_content/${id}.html"><file href="wiki_content/${id}.html"/></resource>`);
      }
      return `<item identifier="i${id}" identifierref="${id}"><title>${xml(title)}</title></item>`;
    });
    return `<item identifier="m${++n}"><title>${xml(module.title)}</title>${inner.join("")}</item>`;
  });
  files["imsmanifest.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?>\n<manifest identifier="cc"><organizations><organization identifier="org"><item identifier="root">${items.join("")}</item></organization></organizations>` +
      `<resources>${resources.join("")}</resources></manifest>`,
  );
  return zipSync(files);
}
