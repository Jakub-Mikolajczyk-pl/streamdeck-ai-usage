/**
 * Unified snapshot of usage for one AI provider in one time window.
 */
export interface UsageWindow {
  /** 0–1, e.g. 0.72 = 72 % used */
  usedPercent: number;
  /** Unix epoch (seconds) when the window resets */
  resetsAt: number;
  /** window size label shown in UI */
  windowLabel: "5h" | "7d";
}

export interface UsageSnapshot {
  /** Provider name for display */
  provider: "Claude" | "Codex";
  /** 5-hour session window */
  session: UsageWindow;
  /** 7-day weekly window */
  weekly: UsageWindow;
  /** When this snapshot was computed (ms) */
  fetchedAt: number;
  /** Error message if data could not be read */
  error?: string;
}

/** Settings stored per action via Stream Deck Property Inspector.
 *  Index signature required by the @elgato/streamdeck JsonObject constraint.
 */
export interface ActionSettings {
  [key: string]: string | number | boolean | null | undefined;
  /** Which window to display on main key face: "session" | "weekly" */
  displayWindow: "session" | "weekly";
  /** Claude token budget per 5h block (billable: input+output+cache_creation).
   *  Default 220k ≈ Claude Pro community estimate. Tweak in PI to match your IDE %. */
  claudeSessionTokenLimit: number;
  /** Claude token budget per 7d window. Default 1.5M ≈ Pro estimate. */
  claudeWeeklyTokenLimit: number;
  /** Refresh interval in seconds (default 60) */
  refreshInterval: number;
}

// Pro plan defaults — measured empirically against IDE percentages:
//   If you used 1.1M tokens and IDE shows 25%, the real budget is ~4.5M / 5h.
//   Weekly works out to ~28M / 7d.
//   These are billable tokens = input + output + cache_creation (cache_read excluded).
export const DEFAULT_SETTINGS: ActionSettings = {
  displayWindow: "session",
  claudeSessionTokenLimit: 4_500_000,
  claudeWeeklyTokenLimit: 28_000_000,
  refreshInterval: 60,
};
