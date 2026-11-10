/** Driving port: the lecturer's opt-in usage counts in Settings (issue #53, ADR 0037). Nothing is sent anywhere. */
export interface UsagePort {
  /** Whether the lecturer has turned counting on. Off until they do. */
  counting(): Promise<boolean>;
  /** Turns counting on or off; turning it off clears the counts. */
  setCounting(on: boolean): Promise<void>;
  /** Each counted event in the lecturer's words with its count. */
  counts(): Promise<{ words: string; count: number }[]>;
  /** Studio's version and the counts by name, as JSON, for the lecturer to copy and send if they choose. */
  report(): Promise<string>;
}
