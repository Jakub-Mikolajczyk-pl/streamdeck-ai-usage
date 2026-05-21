/**
 * Claude usage provider — reads local JSONL files written by Claude Code CLI.
 *
 * File layout:
 *   %USERPROFILE%\.claude\projects\**\*.jsonl          (main sessions)
 *   %USERPROFILE%\.claude\projects\**\subagents\*.jsonl (subagent sessions)
 *
 * We look for lines where type == "assistant" and message.usage exists,
 * then extract timestamp + output_tokens.
 */

import { homedir } from "os";
import { join } from "path";
import { streamJsonl } from "../core/jsonl-reader.js";
import { computeWindows, type TurnEntry } from "../core/session-blocks.js";
import { findJsonlFiles, filterRecentFiles } from "../core/find-jsonl.js";
import type { UsageSnapshot, ActionSettings } from "./types.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ClaudeAssistantLine {
  type: string;
  timestamp?: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

/** Resolve the Claude projects directory, cross-platform */
function claudeProjectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/** Extract all assistant turns from a single JSONL file. Sums billable tokens. */
async function extractTurns(filePath: string): Promise<TurnEntry[]> {
  const turns: TurnEntry[] = [];
  await streamJsonl<ClaudeAssistantLine>(filePath, (obj) => {
    if (obj.type !== "assistant") return;
    if (!obj.timestamp || !obj.message?.usage) return;
    const ts = new Date(obj.timestamp).getTime();
    if (isNaN(ts)) return;
    const u = obj.message.usage;
    // Billable = input + output + cache_creation. Skip cache_read (~10× cheaper).
    const billableTokens =
      (u.input_tokens ?? 0) +
      (u.output_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0);
    turns.push({ timestamp: ts, billableTokens });
  });
  return turns;
}

/**
 * Build a UsageSnapshot for Claude based on local JSONL files.
 * Only reads files modified in the last 7 days to keep scans fast.
 */
export async function getClaudeUsage(
  settings: ActionSettings
): Promise<UsageSnapshot> {
  const fetchedAt = Date.now();

  try {
    const files = await findJsonlFiles(claudeProjectsDir());
    const filesToRead = await filterRecentFiles(files, SEVEN_DAYS_MS);

    // Extract turns from all recent files in parallel
    const turnArrays = await Promise.all(filesToRead.map(extractTurns));
    const allTurns = turnArrays.flat();

    const { session, weekly } = computeWindows(allTurns);

    const sessionPercent = Math.min(
      session.tokens / settings.claudeSessionTokenLimit,
      1
    );
    const weeklyPercent = Math.min(
      weekly.tokens / settings.claudeWeeklyTokenLimit,
      1
    );

    return {
      provider: "Claude",
      session: {
        usedPercent: sessionPercent,
        resetsAt: session.resetsAt,
        windowLabel: "5h",
      },
      weekly: {
        usedPercent: weeklyPercent,
        resetsAt: weekly.resetsAt,
        windowLabel: "7d",
      },
      fetchedAt,
    };
  } catch (err) {
    return {
      provider: "Claude",
      session: { usedPercent: 0, resetsAt: 0, windowLabel: "5h" },
      weekly: { usedPercent: 0, resetsAt: 0, windowLabel: "7d" },
      fetchedAt,
      error: String(err),
    };
  }
}
