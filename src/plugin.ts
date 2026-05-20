import streamDeck from "@elgato/streamdeck";
import { ClaudeUsageAction } from "./actions/claude-action.js";
import { CodexUsageAction } from "./actions/codex-action.js";

// Register both actions
streamDeck.actions.registerAction(new ClaudeUsageAction());
streamDeck.actions.registerAction(new CodexUsageAction());

// Connect to Stream Deck
streamDeck.connect();
