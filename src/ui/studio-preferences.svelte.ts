import type { PreferencesPort } from "../application/ports/preferences.ts";
import { claudeModels } from "../domain/assistant.ts";
import { appearanceAttributes, stepTextSize, type Appearance } from "../domain/appearance.ts";

/**
 * The lecturer's settings as the window uses them: Advanced mode, the hidden companion, the appearance (with
 * its keyboard zoom) and the assistant chosen in Settings. Each change is kept through the preferences port.
 * Kept out of App.svelte.
 */
export class StudioPreferences {
  advanced = $state(false);
  companionHidden = $state(false);
  appearance = $state<Appearance>({} as Appearance);
  /** Whether the chosen assistant may read the open course (ADR 0006). */
  allowed = $state(false);
  /** The assistant chosen in Settings; null for none. */
  chosen = $state<{ provider: string; model: string } | null>(null);
  readonly assistantName = $derived(this.chosen === null ? "none" : (claudeModels.find((model) => model.id === this.chosen?.model)?.label.split(",")[0] ?? "Claude"));
  readonly #preferences: PreferencesPort;

  constructor(preferences: PreferencesPort, appearance: Appearance) {
    this.#preferences = preferences;
    this.appearance = appearance;
    void preferences.advanced().then((on) => (this.advanced = on));
    void preferences.companionHidden().then((hidden) => (this.companionHidden = hidden));
    void this.readAssistant();
  }

  /** Puts the appearance on the document root, where paper-tokens.css reads it (ADR 0020). */
  apply(root: HTMLElement) {
    for (const [name, value] of Object.entries(appearanceAttributes(this.appearance))) root.setAttribute(name, value);
  }

  setAdvanced(on: boolean) {
    this.advanced = on;
    void this.#preferences.setAdvanced(on);
  }

  setCompanionHidden(hidden: boolean) {
    this.companionHidden = hidden;
    void this.#preferences.setCompanionHidden(hidden);
  }

  setAppearance(next: Appearance) {
    this.appearance = next;
    void this.#preferences.setAppearance(next);
  }

  /** Reads whether the assistant may read this course: on opening it. */
  readOptIn(course: string) {
    void this.#preferences.optedIn(course).then((found) => (this.allowed = found));
  }

  setOptIn(course: string, next: boolean) {
    this.allowed = next;
    void this.#preferences.setOptIn(course, next);
  }

  /** Read again after Settings changes it. */
  async readAssistant() {
    const found = await this.#preferences.assistant();
    this.chosen = found.provider === "none" ? null : found;
  }

  /** Ctrl or Cmd with +, − and 0 change the text size from anywhere, as in a browser. */
  zoomKeys(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const textSize = this.appearance.textSize;
    if (event.key === "=" || event.key === "+") this.setAppearance({ ...this.appearance, textSize: stepTextSize(textSize, 1) });
    else if (event.key === "-" || event.key === "_") this.setAppearance({ ...this.appearance, textSize: stepTextSize(textSize, -1) });
    else if (event.key === "0") this.setAppearance({ ...this.appearance, textSize: 100 });
    else return;
    event.preventDefault();
  }
}
