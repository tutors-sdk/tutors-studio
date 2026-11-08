/**
 * How Studio looks for this lecturer: light or dark, a dyslexia-friendly mode, and help for low vision
 * (bigger text and controls, high contrast, no motion). Pure: the UI applies the attributes this gives
 * to the document root, and paper-tokens.css does the rest (ADR 0020).
 */
export interface Appearance {
  /** "system" follows the computer's own light or dark setting. */
  theme: "system" | "light" | "dark";
  /** Dyslexia mode: the British Dyslexia Association style guide's type settings (ADR 0020). */
  dyslexia: boolean;
  /** In dyslexia mode, OpenDyslexic; otherwise a plain sans (Verdana, Arial). */
  dyslexiaFont: "opendyslexic" | "plain";
  /** Text and controls scaled together, as a percentage: 100 to 200. */
  textSize: 100 | 125 | 150 | 175 | 200;
  /** "system" follows the computer's own increased-contrast setting. */
  contrast: "system" | "standard" | "high";
  /** "system" follows the computer's own reduced-motion setting. */
  motion: "system" | "reduced";
}

export const defaultAppearance: Appearance = { theme: "system", dyslexia: false, dyslexiaFont: "opendyslexic", textSize: 100, contrast: "system", motion: "system" };

export const textSizes: readonly Appearance["textSize"][] = [100, 125, 150, 175, 200];

/** The attributes the document root carries for an appearance; the stylesheet keys off these alone. */
export function appearanceAttributes(appearance: Appearance): Record<string, string> {
  return {
    "data-theme": appearance.theme,
    "data-dyslexia": appearance.dyslexia ? appearance.dyslexiaFont : "off",
    "data-text-size": String(appearance.textSize),
    "data-contrast": appearance.contrast,
    "data-motion": appearance.motion,
  };
}

/** The next text size up or down (Ctrl or Cmd with + and -), staying within 100 to 200. */
export function stepTextSize(size: Appearance["textSize"], direction: 1 | -1): Appearance["textSize"] {
  const at = textSizes.indexOf(size);
  return textSizes[Math.min(textSizes.length - 1, Math.max(0, at + direction))];
}

/** Reads a stored appearance, keeping only values Studio knows, so an old or hand-edited setting can't break the window. */
export function readAppearance(stored: unknown): Appearance {
  const raw = (typeof stored === "object" && stored !== null ? stored : {}) as Record<string, unknown>;
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);
  return {
    theme: pick(raw.theme, ["system", "light", "dark"] as const, defaultAppearance.theme),
    dyslexia: raw.dyslexia === true,
    dyslexiaFont: pick(raw.dyslexiaFont, ["opendyslexic", "plain"] as const, defaultAppearance.dyslexiaFont),
    textSize: pick(raw.textSize, textSizes, defaultAppearance.textSize),
    contrast: pick(raw.contrast, ["system", "standard", "high"] as const, defaultAppearance.contrast),
    motion: pick(raw.motion, ["system", "reduced"] as const, defaultAppearance.motion),
  };
}
