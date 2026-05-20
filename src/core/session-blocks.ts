/**
 * Rolling window helpers for Claude usage calculation.
 *
 * Claude Pro limits are session-block based:
 *   - A block starts at the timestamp of the first assistant turn.
 *   - The block ends 5 hours later — tokens/turns within are counted.
 *   - We use a simple rolling approach: look at events in [now-5h, now].
 *
 * Weekly window: events in [now-7d, now].
 */

export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface TurnEntry {
  timestamp: number; // ms epoch
  outputTokens: number;
}

/**
 * Given a list of Claude turns (sorted or unsorted), returns:
 *  - turnCount and outputTokens within the last 5h
 *  - turnCount and outputTokens within the last 7d
 *  - resetsAt (ms epoch) = timestamp of oldest event in 5h window + 5h
 *    (i.e., when the earliest message in the window will fall out of scope)
 */
export function computeWindows(turns: TurnEntry[]): {
  session: { turnCount: number; outputTokens: number; resetsAt: number };
  weekly: { turnCount: number; outputTokens: number; resetsAt: number };
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
      turnCount: sessionTurns.length,
      outputTokens: sessionTurns.reduce((s, t) => s + t.outputTokens, 0),
      // reset = when the oldest msg in window will exit the 5h rolling window
      resetsAt: Math.floor((oldestSessionTs + FIVE_HOURS_MS) / 1000),
    },
    weekly: {
      turnCount: weeklyTurns.length,
      outputTokens: weeklyTurns.reduce((s, t) => s + t.outputTokens, 0),
      resetsAt: Math.floor((oldestWeeklyTs + SEVEN_DAYS_MS) / 1000),
    },
  };
}
