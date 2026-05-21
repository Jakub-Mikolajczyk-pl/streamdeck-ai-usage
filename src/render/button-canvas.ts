/**
 * Renders a 144×144 PNG for a Stream Deck key.
 *
 * Layout:
 *   Top 20px:  provider label ("Claude" / "Codex") — small, muted
 *   Middle:    big percentage number
 *   Below %:   thin progress bar (full width, 8px tall)
 *   Bottom:    reset countdown ("5h" or "↺ 2h14m")
 *
 * Colour scheme:
 *  - Each provider has a brand colour for the label/accent:
 *      Claude → purple (#a78bfa)
 *      Codex  → blue   (#60a5fa)
 *  - Percentage + bar fill colour shifts based on usage level:
 *      0–60%:  green  (#4ade80)
 *      60–85%: amber  (#fbbf24)
 *      85%+:   red    (#f87171)
 */

// @napi-rs/canvas is CJS — use default import + destructure for Node 20 compatibility
import canvasPkg from "@napi-rs/canvas";
const { createCanvas } = canvasPkg as unknown as { createCanvas: typeof import("@napi-rs/canvas").createCanvas };
import type { UsageSnapshot, UsageWindow } from "../providers/types.js";

const SIZE = 144;

function usageColor(pct: number): string {
  if (pct >= 0.85) return "#f87171";
  if (pct >= 0.6) return "#fbbf24";
  return "#4ade80";
}

function brandColor(provider: UsageSnapshot["provider"]): string {
  return provider === "Codex" ? "#60a5fa" : "#a78bfa";
}

function formatCountdown(resetsAtSec: number): string {
  if (!resetsAtSec) return "—";
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = resetsAtSec - nowSec;
  if (diff <= 0) return "↺ now";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `↺ ${h}h${m.toString().padStart(2, "0")}m`;
  return `↺ ${m}m`;
}

function formatStaleAge(fetchedAtMs: number): string {
  const ageSec = Math.floor((Date.now() - fetchedAtMs) / 1000);
  if (ageSec < 120) return "";
  const m = Math.floor(ageSec / 60);
  return `${m}m ago`;
}

/**
 * Render a key image for a given snapshot + which window to show.
 * Returns a base64-encoded PNG string (no "data:image/png;base64," prefix).
 */
export function renderButton(
  snapshot: UsageSnapshot,
  displayWindow: "session" | "weekly"
): string {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  const window: UsageWindow = snapshot[displayWindow];
  const pct = window.usedPercent;
  // Codex → always brand blue. Claude → green/amber/red gradient based on usage.
  const color = snapshot.error
    ? "#6b7280"
    : snapshot.provider === "Codex"
      ? brandColor("Codex")
      : usageColor(pct);

  // Background
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (snapshot.error) {
    // Error state — show provider + error icon
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(snapshot.provider, SIZE / 2, 24);

    ctx.fillStyle = "#f87171";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("ERR", SIZE / 2, 72);

    ctx.fillStyle = "#6b7280";
    ctx.font = "11px sans-serif";
    // Wrap long error to 2 lines max
    const msg = snapshot.error.slice(0, 40);
    ctx.fillText(msg, SIZE / 2, 96);
    return canvas.toBuffer("image/png").toString("base64");
  }

  // Provider label (top) — muted gray
  ctx.fillStyle = "#9ca3af";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(snapshot.provider, SIZE / 2, 22);

  // Window label (top-right corner, tiny)
  const wLabel = displayWindow === "session" ? "5h" : "7d";
  ctx.fillStyle = "#4b5563";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(wLabel, SIZE - 6, 14);
  ctx.textAlign = "center";

  // Big percentage
  const pctText = `${Math.round(pct * 100)}%`;
  ctx.fillStyle = color;
  ctx.font = `bold ${pct === 1 ? 44 : 48}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(pctText, SIZE / 2, 82);

  // Progress bar background
  const barX = 10;
  const barY = 92;
  const barW = SIZE - 20;
  const barH = 8;
  const radius = 4;

  ctx.fillStyle = "#374151";
  roundRect(ctx, barX, barY, barW, barH, radius);
  ctx.fill();

  // Progress bar fill
  const fillW = Math.max(radius * 2, barW * pct);
  ctx.fillStyle = color;
  roundRect(ctx, barX, barY, fillW, barH, radius);
  ctx.fill();

  // Reset countdown
  const countdown = formatCountdown(window.resetsAt);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(countdown, SIZE / 2, 116);

  // Stale indicator (if data is old)
  const stale = formatStaleAge(snapshot.fetchedAt);
  if (stale) {
    ctx.fillStyle = "#4b5563";
    ctx.font = "10px sans-serif";
    ctx.fillText(stale, SIZE / 2, 132);
  }

  return canvas.toBuffer("image/png").toString("base64");
}

function roundRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
