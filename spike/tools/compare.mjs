// Compares two folders file by file and prints a markdown report. Exit 0 always: a spike reports.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const [, , left, right, title] = process.argv;

function walk(root) {
  const files = new Map();
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) visit(full);
      else files.set(relative(root, full).replaceAll("\\", "/"), createHash("sha256").update(readFileSync(full)).digest("hex"));
    }
  };
  visit(root);
  return files;
}

const a = walk(left);
const b = walk(right);
const onlyLeft = [...a.keys()].filter((file) => !b.has(file));
const onlyRight = [...b.keys()].filter((file) => !a.has(file));
const differ = [...a.keys()].filter((file) => b.has(file) && a.get(file) !== b.get(file));
console.log(`### ${title}`);
console.log("");
console.log(`| Files with deno run | Files with the compiled program | Only deno run | Only compiled | Different content |`);
console.log(`| --- | --- | --- | --- | --- |`);
console.log(`| ${a.size} | ${b.size} | ${onlyLeft.length} | ${onlyRight.length} | ${differ.length} |`);
console.log("");
for (const [label, list] of [
  ["Only deno run", onlyLeft],
  ["Only compiled", onlyRight],
  ["Different content", differ],
]) {
  if (list.length === 0) continue;
  console.log(`${label}:`);
  for (const file of list.slice(0, 40)) console.log(`- \`${file}\``);
  if (list.length > 40) console.log(`- and ${list.length - 40} more`);
  console.log("");
}
