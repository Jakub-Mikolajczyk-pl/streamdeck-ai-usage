# Elgato Marketplace deploy checklist

Stan: **NIE GOTOWE do submission yet.** Lista rzeczy do zrobienia zanim
puścimy plugin do Elgato Marketplace.

## Status

| Wymóg | Stan | Notatka |
|---|---|---|
| Działający plugin na Windows | ✅ | Testowane na Stream Deck + |
| Manifest validuje się | ✅ | `Nodejs.Version: "20"`, `SDKVersion: 2` |
| Ikony 144×144 + 288×288 (@2x) | ⚠️ | Placeholder "CL"/"CO" — wymaga prawdziwego designu |
| Plugin icon + category icon | ⚠️ | Placeholder "AI" — wymaga finalnej ikony |
| Działa na macOS | ❌ | Patrz [macOS support](#macos-support) |
| LICENSE | ✅ | MIT |
| CHANGELOG | ✅ | |
| Privacy / no telemetry | ✅ | Brak sieci, brak kluczy |
| URL pluginu w manifest | ❌ | `URL` field do dodania po publikacji GitHub |
| Screenshots (1280×800+) | ❌ | Min. 3, max. 8, format PNG |
| Marketplace description | ❌ | Krótki + długi opis |
| Author info | ⚠️ | `kupciu` — czy ma być pełne imię? |

## Co trzeba dokończyć przed submission

### 1. Prawdziwe ikony
Obecne PNG to placeholdery wygenerowane przez canvas. Marketplace wymaga
profesjonalnych ikon. Potrzebne:

- `imgs/plugin-icon.png` (288×288, @1x 144×144) — logo pluginu w bibliotece
- `imgs/category.png` — ikona kategorii "AI Usage" w panelu akcji
- `imgs/claude-action.png` + `@2x` — ikona klawisza Claude (przed renderem)
- `imgs/codex-action.png` + `@2x` — ikona klawisza Codex

Wytyczne Elgato:
- PNG, transparentne tło, fits within 144×144 / 288×288 z paddingiem
- Czytelne na dark background (Stream Deck default)
- Brand colors: Claude purple (`#a78bfa`), Codex blue (`#60a5fa`)

### 2. Screenshots dla marketplace listing
Min. 3 ujęcia (1280×800 lub większe):

1. Stream Deck z klawiszami Claude + Codex pokazującymi realne procenty
2. Property Inspector w użyciu (configurable budgets)
3. Stan pełnego limitu (czerwony Claude 95%+) — pokazuje że ostrzega

### 3. macOS support
Obecny manifest ma tylko `"Platform": "windows"`. Marketplace zwykle akceptuje
single-platform plugins, ale macOS rozszerza dostępność.

**Co trzeba żeby macOS działało:**
- W `build.mjs` dodać kopię `@napi-rs/canvas-darwin-arm64` i `-darwin-x64` packages
- W `manifest.json` dodać `{"Platform": "mac", "MinimumVersion": "10.15"}` do OS array
- `homedir()` już działa cross-platform → ścieżki `~/.claude/` i `~/.codex/` są te same
- Testowanie wymaga Maca

Implementacja powinna być prosta, problem to brak Maca do walidacji.

### 4. Manifest dopinki

```json
{
  "URL": "https://github.com/<your-username>/streamdeck-ai-usage",
  "Author": "Your Full Name",
  ...
}
```

`Author` powinno być pełne imię — Elgato wymaga prawdziwej tożsamości.

### 5. Description (długa)
Krótki opis (~280 znaków, do listing tile):
> See your Claude Code and Codex CLI usage limits at a glance on Stream Deck.
> Reads local session files — no API keys, no network calls. Configurable token
> budgets per plan, rolling 5-hour and weekly windows, color-coded gradient warning.

Długi opis (markdown OK):
- What it does
- How it works (privacy: local files only)
- Limitations (Claude budget calibration, Codex stale data)
- Plans supported (Pro, Plus, Max, etc.)

## Submission flow

1. Push do publicznego GitHub repo
2. Tag `v0.1.0` + GitHub release z `.streamDeckPlugin` jako asset
3. Login do <https://marketplace.elgato.com/account>
4. New Plugin → upload `.streamDeckPlugin` + screenshots + opisy
5. Review (~5-14 dni) — Elgato może zwrócić feedback nt. ikon/opisu

## Po publikacji
- Auto-update: marketplace klienci dostają nowe wersje gdy zwiększysz `Version` w manifest
- Telemetry: Elgato podaje download counts w dashboardzie
- Issues od userów najlepiej kierować na GitHub Issues
