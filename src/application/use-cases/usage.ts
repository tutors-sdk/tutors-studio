import { countOne, readCounts, usageLines, usageReport } from "../../domain/usage.ts";
import type { SettingsPort } from "../ports/settings.ts";
import type { TelemetryPort } from "../ports/telemetry.ts";
import type { UsagePort } from "../ports/usage.ts";

/**
 * Opt-in usage counts over the settings store (issue #53, ADR 0037). Counts are numbers by event name,
 * kept on this computer; nothing leaves it unless the lecturer copies the report and sends it themselves.
 */
export function createUsage(deps: { settings: SettingsPort; version: () => Promise<string> }): UsagePort & { record(name: string): Promise<void> } {
  const { settings } = deps;
  // Events can arrive together (a save, then an accepted change): each count waits for the one before.
  let queue: Promise<void> = Promise.resolve();
  return {
    counting: async () => (await settings.get("usageCounting")) === true,
    async setCounting(on: boolean) {
      await queue;
      await settings.set("usageCounting", on);
      if (!on) await settings.set("usageCounts", {});
    },
    counts: async () => usageLines(readCounts(await settings.get("usageCounts"))),
    report: async () => usageReport(readCounts(await settings.get("usageCounts")), await deps.version()),
    record(name: string) {
      queue = queue.then(async () => {
        if ((await settings.get("usageCounting")) !== true) return;
        const before = readCounts(await settings.get("usageCounts"));
        const after = countOne(before, name);
        if (after !== before) await settings.set("usageCounts", after);
      });
      return queue;
    },
  };
}

/** Telemetry that also counts, when the lecturer has turned counting on. The events' details are never counted. */
export function countingTelemetry(inner: TelemetryPort, usage: { record(name: string): Promise<void> }): TelemetryPort {
  return {
    event(name, props) {
      inner.event(name, props);
      void usage.record(name);
    },
  };
}
