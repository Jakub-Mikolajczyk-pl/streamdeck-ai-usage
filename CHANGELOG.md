# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-05-21

Initial release.

### Added
- Two Stream Deck actions: **Claude Usage** and **Codex Usage**.
- Claude provider: scans `~/.claude/projects/**/*.jsonl`, sums billable tokens
  (input + output + cache_creation) in rolling 5h / 7d windows. Compares
  against configurable plan budget (default tuned to Pro plan ≈ 4.5M / 5h).
- Codex provider: scans `~/.codex/sessions/**/*.jsonl`, reads the most recent
  server-provided `rate_limits.primary.used_percent` and `secondary.used_percent`.
  No estimation needed — values come directly from the Codex API response.
- Stale data detection for Codex: if `resets_at` is in the past, the window
  has already rolled over since the data was captured, so we show 0%.
- 144×144 PNG render: percentage, progress bar, reset countdown.
  - Codex: brand blue (`#60a5fa`).
  - Claude: green / amber / red gradient based on usage level.
- Property Inspector with configurable display window (5h / 7d),
  refresh interval, and Claude token budgets.
- Windows-only manifest. No API keys, no network calls — all data from local files.
