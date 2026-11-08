/** Driven port: what happened, kept on this machine unless the lecturer opts in to send it. Journeys assert on these same events. */
export interface TelemetryEvent {
  name: string;
  props: Record<string, string | number | boolean>;
}

export interface TelemetryPort {
  event(name: string, props?: TelemetryEvent["props"]): void;
}
