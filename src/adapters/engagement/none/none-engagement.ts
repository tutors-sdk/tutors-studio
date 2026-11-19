import type { EngagementPort } from "../../../application/ports/engagement.ts";

/**
 * No engagement: a real adapter, not a missing one (ADRs 0005, 0050). It reads nothing, so Studio shows no
 * figures and every journey runs as it does with figures (STU-0200).
 */
export const noEngagement: EngagementPort = {
  weeks: async () => null,
};
