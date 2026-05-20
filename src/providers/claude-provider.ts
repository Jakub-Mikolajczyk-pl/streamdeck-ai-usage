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

import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { streamJsonl } from "../core/jsonl-reader.js";
import { computeWindows, type TurnEntry } from "../core/session-blocks.js";
import type { UsageSnapshot, ActionSettings } from "./types.js";

interface ClaudeAssistantLine {
  type: string;
  timestamp?: string;
  message?: {
    model?: string;
    usage?: {
      output_tokens?: number;
      input_tokens?: number;
    };
  };
}

/** Resolve the Claude projects directory, cross-platform */
function claudeProjectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/** Recursively find all *.jsonl files under a directory */
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

/** Find all session JSONL files in the Claude projects directory */
async function findSessionFiles(): Promise<string[]> {
  return findJsonlFiles(claudeProjectsDir());
}

/** Extract all assistant turns from a single JSONL file */
async function extractTurns(filePath: string): Promise<TurnEntry[]> {
  const turns: TurnEntry[] = [];
  await streamJsonl<ClaudeAssistantLine>(filePath, (obj) => {
    if (obj.type !== "assistant") return;
    if (!obj.timestamp || !obj.message?.usage) return;
    const ts = new Date(obj.timestamp).getTime();
    if (isNaN(ts)) return;
    const outputTokens = obj.message.usage.output_tokens ?? 0;
    turns.push({ timestamp: ts, outputTokens });
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
  const sevenDaysAgo = fetchedAt - 7 * 24 * 60 * 60 * 1000;

  try {
    const files = await findSessionFiles();

    // Filter to recently modified files only (7d) for performance
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

    // Extract turns from all recent files in parallel
    const turnArrays = await Promise.all(filesToRead.map(extractTurns));
    const allTurns = turnArrays.flat();

    const { session, weekly } = computeWindows(allTurns);

    const sessionPercent = Math.min(
      session.turnCount / settings.claudeTurnLimit,
      1
    );
    const weeklyPercent = Math.min(
      weekly.turnCount / settings.claudeWeeklyLimit,
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
