/**
 * Plugin entry point.
 *
 * Optional debug logging can be enabled by setting environment variable
 *   SD_AI_USAGE_DEBUG=1
 * Logs go to <os.tmpdir>/sd-ai-usage-debug.log — useful when Stream Deck
 * silently fails to launch the plugin (since stdout is not captured).
 */

import streamDeck from "@elgato/streamdeck";
import { appendFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { ClaudeUsageAction } from "./actions/claude-action.js";
import { CodexUsageAction } from "./actions/codex-action.js";

const DEBUG = process.env["SD_AI_USAGE_DEBUG"] === "1";
const debugLog = join(tmpdir(), "sd-ai-usage-debug.log");
function log(msg: string): void {
  if (!DEBUG) return;
  try {
    appendFileSync(debugLog, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    /* swallow */
  }
}

// Surface uncaught errors so we never silently die
process.on("uncaughtException", (err) => {
  log(`UNCAUGHT: ${err.stack || err.message}`);
});
process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

async function main(): Promise<void> {
  log("Plugin starting");
  streamDeck.actions.registerAction(new ClaudeUsageAction());
  streamDeck.actions.registerAction(new CodexUsageAction());
  await streamDeck.connect();
  log("Connected to Stream Deck");
}

main().catch((err) => {
  log(`STARTUP CRASH: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
