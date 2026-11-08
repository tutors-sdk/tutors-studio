/** A deck rendered as the reader renders it: the theme's CSS and one HTML fragment per slide. */
export interface RenderedDeck {
  css: string;
  slides: string[];
}

/** Driven port: the slide renderer the reader uses for Marp decks (ADR 0018). */
export interface SlidesPort {
  render(deck: string): RenderedDeck;
}
