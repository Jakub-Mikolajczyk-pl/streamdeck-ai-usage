/**
 * Shared logic for both Claude and Codex actions.
 *
 * Each action:
 *  - Polls on a timer (default 60s)
 *  - Re-renders on settings change
 *  - Force-refreshes on key press
 */

import type {
  KeyDownEvent,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  KeyAction,
} from "@elgato/streamdeck";
import { SingletonAction } from "@elgato/streamdeck";
import { renderButton } from "../render/button-canvas.js";
import type { UsageSnapshot, ActionSettings } from "../providers/types.js";
import { DEFAULT_SETTINGS } from "../providers/types.js";

export type ProviderFn = (settings: ActionSettings) => Promise<UsageSnapshot>;

export abstract class BaseUsageAction extends SingletonAction<ActionSettings> {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly provider: ProviderFn) {
    super();
  }

  override async onWillAppear(
    ev: WillAppearEvent<ActionSettings>
  ): Promise<void> {
    if (!ev.action.isKey()) return;
    const settings = mergeSettings(ev.payload.settings);
    await this.refresh(ev.action, settings);
    this.scheduleNext(ev.action.id, ev.action, settings);
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<ActionSettings>
  ): Promise<void> {
    this.clearTimer(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
    if (!ev.action.isKey()) return;
    const settings = mergeSettings(ev.payload.settings);
    this.clearTimer(ev.action.id);
    await this.refresh(ev.action, settings);
    this.scheduleNext(ev.action.id, ev.action, settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<ActionSettings>
  ): Promise<void> {
    if (!ev.action.isKey()) return;
    const settings = mergeSettings(ev.payload.settings);
    this.clearTimer(ev.action.id);
    await this.refresh(ev.action, settings);
    this.scheduleNext(ev.action.id, ev.action, settings);
  }

  private async refresh(
    key: KeyAction<ActionSettings>,
    settings: ActionSettings
  ): Promise<void> {
    try {
      const snapshot = await this.provider(settings);
      const img = renderButton(snapshot, settings.displayWindow);
      await key.setImage(`data:image/png;base64,${img}`);
      await key.setTitle("");
    } catch (err) {
      // Show error state without crashing
      console.error("[ai-usage] refresh error:", err);
    }
  }

  private scheduleNext(
    ctx: string,
    key: KeyAction<ActionSettings>,
    settings: ActionSettings
  ): void {
    const intervalMs = (settings.refreshInterval ?? 60) * 1000;
    const timer = setTimeout(async () => {
      await this.refresh(key, settings);
      this.scheduleNext(ctx, key, settings);
    }, intervalMs);
    this.timers.set(ctx, timer);
  }

  private clearTimer(ctx: string): void {
    const timer = this.timers.get(ctx);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(ctx);
    }
  }
}

/** Merge stored settings with defaults, coercing types from JSON */
function mergeSettings(raw: Partial<ActionSettings> = {}): ActionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    claudeSessionTokenLimit: Number(
      raw.claudeSessionTokenLimit ?? DEFAULT_SETTINGS.claudeSessionTokenLimit
    ),
    claudeWeeklyTokenLimit: Number(
      raw.claudeWeeklyTokenLimit ?? DEFAULT_SETTINGS.claudeWeeklyTokenLimit
    ),
    refreshInterval: Number(raw.refreshInterval ?? DEFAULT_SETTINGS.refreshInterval),
    displayWindow:
      raw.displayWindow === "weekly" ? "weekly" : "session",
  };
}
