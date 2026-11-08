import { Marp } from "@marp-team/marp-core";
import type { RenderedDeck, SlidesPort } from "../../../application/ports/slides.ts";

/** Marp as the generator configures it (html allowed), without Marp's helper script: Studio runs no deck script. */
const marp = new Marp({ html: true, script: false });

/** SlidesPort over Marp, the version the reader renders talks with. */
export const marpSlides: SlidesPort = {
  render(deck: string): RenderedDeck {
    const { html, css } = marp.render(deck, { htmlAsArray: true });
    return { css, slides: html };
  },
};
