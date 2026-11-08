/**
 * When the companion speaks (ADR 0015): a fixed table of a trigger, a condition, one sentence, one action
 * and a cool-down. A model never adds to it. Pure, so every trigger can be fired against every state.
 */
export type CompanionEvent = "course-opened" | "course-created" | "change-applied" | "week-opened";

export interface CompanionState {
  errors: number;
  /** The week on screen has nothing in it yet. */
  emptyWeek: boolean;
  /** An assistant is chosen that needs this course's permission and doesn't have it (ADR 0006). */
  needsPermission: boolean;
  /** The lecturer is typing or dragging. */
  busy: boolean;
  hidden: boolean;
}

/** "problem" is the week holding the first thing to sort out. */
export type CompanionDestination = "problem" | "check" | "publish" | "settings";
export type Pose = "idle" | "noticing" | "thinking" | "pleased";

export interface Moment {
  id: string;
  text: string;
  pose: Pose;
  /** At most one, and only ever a place to go: the companion changes nothing itself. */
  action: { label: string; goes: CompanionDestination } | null;
}

/** Ten minutes: long enough that the same sentence never nags. */
export const COOL_DOWN_MS = 10 * 60 * 1000;

const things = (count: number) => `${count} ${count === 1 ? "thing needs" : "things need"}`;

interface Row {
  id: string;
  on: CompanionEvent;
  when: (state: CompanionState) => boolean;
  say: (state: CompanionState) => string;
  pose: Pose;
  action: Moment["action"];
}

/** First matching row wins, so a moment can never stack on another. */
export const moments: readonly Row[] = [
  { id: "created", on: "course-created", when: () => true, say: () => "Your weeks are ready. Choose one and drop your slides onto it.", pose: "pleased", action: null },
  {
    id: "needs-fixing",
    on: "course-opened",
    when: (state) => state.errors > 0,
    say: (state) => `${things(state.errors)} sorting out before students can see everything.`,
    pose: "noticing",
    action: { label: "Show me", goes: "problem" },
  },
  {
    id: "permission",
    on: "course-opened",
    when: (state) => state.needsPermission,
    say: () => "Your assistant can't read this course yet. You decide that for each course.",
    pose: "noticing",
    action: { label: "Decide now", goes: "check" },
  },
  {
    id: "all-clear",
    on: "course-opened",
    when: (state) => state.errors === 0,
    say: () => "Everything checks out. This course is ready when you are.",
    pose: "pleased",
    action: { label: "Publish", goes: "publish" },
  },
  {
    id: "still-to-fix",
    on: "change-applied",
    when: (state) => state.errors > 0,
    say: (state) => `That's done. ${things(state.errors)} sorting out still.`,
    pose: "noticing",
    action: { label: "Show me", goes: "problem" },
  },
  {
    id: "fixed-all",
    on: "change-applied",
    when: (state) => state.errors === 0,
    say: () => "That's done, and nothing is left to fix.",
    pose: "pleased",
    action: { label: "Publish", goes: "publish" },
  },
  {
    id: "empty-week",
    on: "week-opened",
    when: (state) => state.emptyWeek,
    say: () => "Nothing here yet. Drop your slides, notes or links on this week.",
    pose: "idle",
    action: null,
  },
];

/** The moment for an event, or null to stay quiet. `spoken` is when each moment last spoke. */
export function momentFor(event: CompanionEvent, state: CompanionState, spoken: ReadonlyMap<string, number>, now: number): Moment | null {
  if (state.busy || state.hidden) return null;
  const row = moments.find((candidate) => candidate.on === event && candidate.when(state));
  if (row === undefined) return null;
  const last = spoken.get(row.id);
  if (last !== undefined && now - last < COOL_DOWN_MS) return null;
  return { id: row.id, text: row.say(state), pose: row.pose, action: row.action };
}
