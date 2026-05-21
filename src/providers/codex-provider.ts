/**
 * Codex usage provider — reads local JSONL files written by Codex CLI/Desktop.
 *
 * File layout:
 *   %USERPROFILE%\.codex\sessions\YYYY\MM\DD\rollout-*.jsonl
 *
 * We look for the most recent "event_msg" / "token_count" line
 * that has a non-null rate_limits field. That field already contains
 * the server-computed used_percent and resets_at timestamps.
 *
 * This means: no token math needed for Codex — just read the latest value.
 */

import { homedir } from "os";
import { join } from "path";
import { streamJsonl } from "../core/jsonl-reader.js";
import { findJsonlFiles, filterRecentFiles } from "../core/find-jsonl.js";
import type { UsageSnapshot, ActionSettings } from "./types.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface CodexRateLimits {
  limit_id?: string;
  primary?: {
    used_percent?: number;
    window_minutes?: number;
    resets_at?: number; // Unix epoch (seconds)
  };
  secondary?: {
    used_percent?: number;
    window_minutes?: number;
    resets_at?: number;
  };
  plan_type?: string;
}

interface CodexTokenCountLine {
  timestamp?: string;
  type?: string;
  payload?: {
    type?: string;
    rate_limits?: CodexRateLimits | null;
  };
}

function codexSessionsDir(): string {
  const codexHome = process.env["CODEX_HOME"] ?? join(homedir(), ".codex");
  return join(codexHome, "sessions");
}

interface RateLimitRecord {
  timestamp: number; // ms epoch
  rateLimits: CodexRateLimits;
}

/** Extract the last rate_limits record from a single Codex JSONL file */
async function extractLastRateLimits(
  filePath: string
): Promise<RateLimitRecord | null> {
  let last: RateLimitRecord | null = null;
  await streamJsonl<CodexTokenCountLine>(filePath, (obj) => {
    if (obj.type !== "event_msg") return;
    if (obj.payload?.type !== "token_count") return;
    if (!obj.payload.rate_limits) return;
    const ts = obj.timestamp ? new Date(obj.timestamp).getTime() : 0;
    if (isNaN(ts)) return;
    last = { timestamp: ts, rateLimits: obj.payload.rate_limits };
  });
  return last;
}

/**
 * Build a UsageSnapshot for Codex.
 * Scans sessions from the last 7 days, picks the most recent token_count
 * event that has rate_limits, and reads the server-provided percentages.
 */
export async function getCodexUsage(
  _settings: ActionSettings
): Promise<UsageSnapshot> {
  const fetchedAt = Date.now();

  try {
    const files = await findJsonlFiles(codexSessionsDir());
    const filesToRead = await filterRecentFiles(files, SEVEN_DAYS_MS);

    // Extract last rate_limit record from each file in parallel
    const records = await Promise.all(filesToRead.map(extractLastRateLimits));

    // Pick the globally most recent one
    const latest = records
      .filter((r): r is RateLimitRecord => r !== null)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!latest) {
      return {
        provider: "Codex",
        session: { usedPercent: 0, resetsAt: 0, windowLabel: "5h" },
        weekly: { usedPercent: 0, resetsAt: 0, windowLabel: "7d" },
        fetchedAt,
        error: "No Codex sessions found — run Codex at least once",
      };
    }

    const rl = latest.rateLimits;
    const nowSec = Math.floor(Date.now() / 1000);
    const sessionResetsAt = rl.primary?.resets_at ?? 0;
    const weeklyResetsAt = rl.secondary?.resets_at ?? 0;

    // Codex's used_percent is on a 0–100 scale (NOT 0–1). Convert to fraction.
    // Also: if reset time has already passed, window has rolled over since this
    // data was captured — effective usage = 0%.
    const toFraction = (raw: number): number =>
      Math.max(0, Math.min(raw / 100, 1));
    const sessionPercent =
      sessionResetsAt > nowSec ? toFraction(rl.primary?.used_percent ?? 0) : 0;
    const weeklyPercent =
      weeklyResetsAt > nowSec ? toFraction(rl.secondary?.used_percent ?? 0) : 0;

    return {
      provider: "Codex",
      session: {
        usedPercent: sessionPercent,
        resetsAt: sessionResetsAt,
        windowLabel: "5h",
      },
      weekly: {
        usedPercent: weeklyPercent,
        resetsAt: weeklyResetsAt,
        windowLabel: "7d",
      },
      fetchedAt,
    };
  } catch (err) {
    return {
      provider: "Codex",
      session: { usedPercent: 0, resetsAt: 0, windowLabel: "5h" },
      weekly: { usedPercent: 0, resetsAt: 0, windowLabel: "7d" },
      fetchedAt,
      error: String(err),
    };
  }
}
