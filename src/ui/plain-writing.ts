/**
 * The plain-writing editor's building blocks (ADR 0026): TipTap with the marks and blocks a page needs,
 * reading and writing markdown through @tiptap/markdown. Used by PlainEditor and by its round-trip test.
 */
import { Editor, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";

export const plainExtensions = (): Extensions => [StarterKit.configure({ link: { openOnClick: false, autolink: true } }), Image.configure({ inline: false }), Markdown];

/** An editor over a page's markdown, mounted on `element` (or headless when it is undefined). */
export function plainEditor(markdown: string, element?: HTMLElement, onChange?: (markdown: string) => void): Editor {
  return new Editor({
    element,
    extensions: plainExtensions(),
    content: markdown,
    contentType: "markdown",
    onUpdate: ({ editor }) => onChange?.(editor.getMarkdown()),
  });
}

/** What saving a page written plainly would write: the page as the editor reads it back. */
export const throughPlainWriting = (markdown: string): string => {
  const editor = plainEditor(markdown);
  try {
    return editor.getMarkdown();
  } finally {
    editor.destroy();
  }
};
