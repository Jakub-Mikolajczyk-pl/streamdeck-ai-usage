import { action } from "@elgato/streamdeck";
import { BaseUsageAction } from "./base-action.js";
import { getCodexUsage } from "../providers/codex-provider.js";

@action({ UUID: "com.kupciu.ai-usage.codex" })
export class CodexUsageAction extends BaseUsageAction {
  constructor() {
    super(getCodexUsage);
  }
}
