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
  /** For Claude: configurable limit (turns per 5h). Default = 45 for Pro */
  claudeTurnLimit: number;
  /** For Claude: configurable weekly turn limit. Default = 200 for Pro */
  claudeWeeklyLimit: number;
  /** Refresh interval in seconds (default 60) */
  refreshInterval: number;
}

export const DEFAULT_SETTINGS: ActionSettings = {
  displayWindow: "session",
  claudeTurnLimit: 45,
  claudeWeeklyLimit: 200,
  refreshInterval: 60,
};
