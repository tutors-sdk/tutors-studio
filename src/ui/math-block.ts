/**
 * Maths as Tutors reads it: a block between $$ lines, kept as the lecturer typed it (feature 11). Studio
 * shows it as text and never draws it; the reader draws it with KaTeX. A TipTap node with its own
 * markdown tokenizer, so nothing inside ($, _, *) is read as formatting.
 */
import { Node } from "@tiptap/core";

const BLOCK = /^\$\$[ \t]*\n([\s\S]*?)\n\$\$[ \t]*(?:\n|$)/;

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  parseHTML: () => [{ tag: "pre[data-maths]", preserveWhitespace: "full" }],
  renderHTML: () => ["pre", { "data-maths": "", class: "maths", "aria-label": "Maths" }, 0],
  markdownTokenName: "mathBlock",
  markdownTokenizer: {
    name: "mathBlock",
    level: "block",
    start: (src: string) => src.search(/^\$\$/m),
    tokenize(src: string) {
      const found = BLOCK.exec(src);
      return found ? { type: "mathBlock", raw: found[0], text: found[1] } : undefined;
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode("mathBlock", {}, token.text ? [helpers.createTextNode(token.text as string)] : []),
  renderMarkdown: (node) => `$$\n${(node.content ?? []).map((child) => child.text ?? "").join("")}\n$$`,
});
