/**
 * The plain-writing editor's building blocks (ADR 0026): TipTap with the marks and blocks a page needs,
 * reading and writing markdown through @tiptap/markdown. Used by PlainEditor and by its round-trip test.
 */
import { Editor, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { splitSettings } from "../domain/plain-writing.ts";

export const plainExtensions = (): Extensions => [StarterKit.configure({ link: { openOnClick: false, autolink: true } }), Image.configure({ inline: false }), Markdown];

const settingsOf = new WeakMap<Editor, string>();

/** The whole page an editor holds: its settings at the top, kept as they were, then the writing. */
export const pageOf = (editor: Editor): string => (settingsOf.get(editor) ?? "") + editor.getMarkdown();

/**
 * An editor over a page's writing, mounted on `element` (or headless when it is undefined). Settings
 * between --- lines at the top aren't shown; `onChange` and `pageOf` give the page with them put back.
 */
export function plainEditor(markdown: string, element?: HTMLElement, onChange?: (markdown: string) => void): Editor {
  const { settings, writing } = splitSettings(markdown);
  const editor = new Editor({
    element,
    extensions: plainExtensions(),
    content: writing,
    contentType: "markdown",
    onUpdate: ({ editor }) => onChange?.(pageOf(editor)),
  });
  settingsOf.set(editor, settings);
  return editor;
}

/** What saving a page written plainly would write: the page as the editor reads it back. */
export const throughPlainWriting = (markdown: string): string => {
  const editor = plainEditor(markdown);
  try {
    return pageOf(editor);
  } finally {
    editor.destroy();
  }
};
