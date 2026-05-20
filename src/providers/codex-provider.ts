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

import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { streamJsonl } from "../core/jsonl-reader.js";
import type { UsageSnapshot, ActionSettings } from "./types.js";

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

async function findJsonlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
      .map((e) => join(e.parentPath ?? (e as { path?: string }).path ?? dir, e.name));
  } catch {
    return [];
  }
}

async function findCodexFiles(): Promise<string[]> {
  return findJsonlFiles(codexSessionsDir());
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
  const sevenDaysAgo = fetchedAt - 7 * 24 * 60 * 60 * 1000;

  try {
    const files = await findCodexFiles();

    // Filter to recently modified files only
    const recentFiles = await Promise.all(
      files.map(async (f) => {
        try {
          const s = await stat(f);
          return s.mtimeMs >= sevenDaysAgo ? f : null;
        } catch {
          return null;
        }
      })
    );

    const filesToRead = recentFiles.filter((f): f is string => f !== null);

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
    const sessionPercent = Math.min(rl.primary?.used_percent ?? 0, 1);
    const weeklyPercent = Math.min(rl.secondary?.used_percent ?? 0, 1);
    const sessionResetsAt = rl.primary?.resets_at ?? 0;
    const weeklyResetsAt = rl.secondary?.resets_at ?? 0;

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
