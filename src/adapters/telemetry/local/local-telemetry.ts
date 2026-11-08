import type { TelemetryEvent, TelemetryPort } from "../../../application/ports/telemetry.ts";

/** Keeps events on this machine, in order. Nothing is sent anywhere. Journeys read `events` to assert what happened. */
export class LocalTelemetry implements TelemetryPort {
  readonly events: TelemetryEvent[] = [];

  event(name: string, props: TelemetryEvent["props"] = {}): void {
    this.events.push({ name, props });
  }
}
