/** Driven port: draws a page's markdown for the editor's preview (ADR 0025). */
export interface MarkdownPort {
  /** HTML for the page, with any raw HTML in it shown as text, so a preview never runs a page's markup. */
  render(markdown: string): string;
}
