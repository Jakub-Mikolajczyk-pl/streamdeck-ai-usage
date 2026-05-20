import { action } from "@elgato/streamdeck";
import { BaseUsageAction } from "./base-action.js";
import { getClaudeUsage } from "../providers/claude-provider.js";

@action({ UUID: "com.kupciu.ai-usage.claude" })
export class ClaudeUsageAction extends BaseUsageAction {
  constructor() {
    super(getClaudeUsage);
  }
}
