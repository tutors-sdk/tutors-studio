import MarkdownIt from "markdown-it";
import type { MarkdownPort } from "../../../application/ports/markdown.ts";

const renderer = new MarkdownIt({ html: false, linkify: true });

/** MarkdownPort over markdown-it. `html: false` keeps a page's raw HTML as text in the preview. */
export const markdownItPages: MarkdownPort = {
  render: (markdown) => renderer.render(markdown),
};
