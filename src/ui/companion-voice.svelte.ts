import { momentFor, type CompanionEvent, type CompanionState, type Moment } from "../application/companion/moments.ts";

const BUSY_MS = 2500;

/**
 * What the companion says, and when (ADR 0015): one moment at a time, each with its cool-down, and silent
 * for a moment after any typing or dragging. Kept out of App.svelte.
 */
export class CompanionVoice {
  moment = $state<Moment | null>(null);
  #spoken = new Map<string, number>();
  #busyUntil = 0;

  /** Typing in a field keeps the companion quiet for a moment. */
  typing(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.matches("input, textarea, select, [contenteditable=true]")) this.#busyUntil = Date.now() + BUSY_MS;
  }
  dragging() {
    this.#busyUntil = Date.now() + BUSY_MS;
  }

  /** Says the moment that fits the event and the course as it stands, if there is one and it hasn't just been said. */
  hear(event: CompanionEvent, state: Omit<CompanionState, "busy">) {
    const found = momentFor(event, { ...state, busy: Date.now() < this.#busyUntil }, this.#spoken, Date.now());
    if (found === null) return;
    this.#spoken.set(found.id, Date.now());
    this.moment = found;
  }

  hush() {
    this.moment = null;
  }
}
