/**
 * Rolling window helpers for Claude usage calculation.
 *
 * Strategy:
 *   - Count tokens (not turns) in [now-5h, now] and [now-7d, now]
 *   - "Billable" tokens = input + output + cache_creation
 *     (we skip cache_read because those are ~10× cheaper and barely count toward
 *      rate limits in practice)
 *   - Compare to configurable token budgets per plan
 */

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface TurnEntry {
  timestamp: number; // ms epoch
  billableTokens: number;
}

export function computeWindows(turns: TurnEntry[]): {
  session: { tokens: number; resetsAt: number };
  weekly: { tokens: number; resetsAt: number };
} {
  const now = Date.now();
  const sessionCutoff = now - FIVE_HOURS_MS;
  const weeklyCutoff = now - SEVEN_DAYS_MS;

  const sessionTurns = turns.filter((t) => t.timestamp >= sessionCutoff);
  const weeklyTurns = turns.filter((t) => t.timestamp >= weeklyCutoff);

  const oldestSessionTs =
    sessionTurns.length > 0
      ? Math.min(...sessionTurns.map((t) => t.timestamp))
      : now;

  const oldestWeeklyTs =
    weeklyTurns.length > 0
      ? Math.min(...weeklyTurns.map((t) => t.timestamp))
      : now;

  return {
    session: {
      tokens: sessionTurns.reduce((s, t) => s + t.billableTokens, 0),
      // reset = when the oldest msg in window will fall out of the 5h window
      resetsAt: Math.floor((oldestSessionTs + FIVE_HOURS_MS) / 1000),
    },
    weekly: {
      tokens: weeklyTurns.reduce((s, t) => s + t.billableTokens, 0),
      resetsAt: Math.floor((oldestWeeklyTs + SEVEN_DAYS_MS) / 1000),
    },
  };
}
