import type { AgentDesk } from "../application/use-cases/agent-desk.ts";
import type { WaitingPlan } from "../application/ports/agent-plans.ts";
import type { Plan } from "../domain/plan.ts";

/**
 * An assistant on this computer while a course is open (ADRs 0051, 0052): the lecturer's switch, and its plans
 * waiting for Accept, read again every few seconds (STU-0205). Kept out of App.svelte.
 */
export class AgentSession {
  allowed = $state(false);
  waiting = $state<WaitingPlan[]>([]);
  #desk: AgentDesk | undefined;

  /** Watches the desk's plans until the returned stop; `fresh` hears when a plan arrives that wasn't there before. */
  watch(desk: AgentDesk | undefined, fresh: () => void): (() => void) | undefined {
    this.#desk = desk;
    this.waiting = [];
    if (!desk) return undefined;
    let told = new Set<string>();
    const look = async () => {
      const found = await desk.waiting().catch(() => [] as WaitingPlan[]);
      this.waiting = found;
      if (found.some((entry) => !told.has(entry.id))) fresh();
      told = new Set(found.map((entry) => entry.id));
    };
    void desk.allowed().then((found) => (this.allowed = found));
    void desk.open().then(look);
    const every = setInterval(look, 3000);
    return () => {
      clearInterval(every);
      void desk.close();
    };
  }

  /** What Check shows of it: the switch, the plans waiting, and accepting one through `apply` (STU-0205). */
  forCheck(apply: (plan: Plan) => Promise<boolean>) {
    return {
      allowed: this.allowed,
      set: (next: boolean) => void this.allow(next),
      waiting: this.waiting,
      onAccept: (id: string) => void this.accept(id, apply),
      onDecline: (id: string) => void this.decline(id),
    };
  }

  async allow(next: boolean) {
    if (!this.#desk) return;
    this.allowed = next;
    await this.#desk.allow(next);
  }

  async accept(id: string, apply: (plan: Plan) => Promise<boolean>) {
    if (!this.#desk) return;
    this.waiting = this.waiting.filter((entry) => entry.id !== id);
    await this.#desk.accept(id, apply);
  }

  async decline(id: string) {
    if (!this.#desk) return;
    this.waiting = this.waiting.filter((entry) => entry.id !== id);
    await this.#desk.decline(id);
  }
}
