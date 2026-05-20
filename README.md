# AI Usage Limits — Stream Deck Plugin

Pokazuje zużycie limitów Claude Code i Codex CLI bezpośrednio na klawiszach Stream Decka.  
**Brak API keys. Brak sieci. Tylko lokalne pliki.**

## Co robi

| Klawisz | Źródło danych | Okno |
|---|---|---|
| **Claude** | `~/.claude/projects/**/*.jsonl` | 5h (turny) / 7d |
| **Codex** | `~/.codex/sessions/**/*.jsonl` | 5h % / 7d % z serwera |

Klik na klawisz = natychmiastowe odświeżenie.  
Kolor: 🟢 <60% → 🟡 60-85% → 🔴 >85%.

## Instalacja (dev / sideload)

### Wymagania
- Node.js ≥ 20
- Stream Deck desktop app ≥ 6.5
- `@elgato/cli`: `npm install -g @elgato/cli`

### Krok 1 — build
```bash
cd E:\repo\streamdeck-ai-usage
npm install
npm run build
```

### Krok 2 — link do Stream Deck
```bash
streamdeck link com.kupciu.ai-usage.sdPlugin
```
> Tworzy symlink do `%APPDATA%\Elgato\StreamDeck\Plugins\`.  
> Następnie w Stream Deck: ⚙️ → Restart Stream Deck, albo po prostu przeciągnij akcje z panelu.

### Krok 3 — dodaj akcje
Otwórz Stream Deck → w bibliotece akcji (prawa strona) znajdź kategorię **"AI Usage"** → przeciągnij **Claude Usage** i **Codex Usage** na wybrane klawisze.

### Krok 4 — skonfiguruj
Kliknij klawisz → otwiera się Property Inspector:
- **Display window**: `5h` (session) lub `7d` (weekly)
- **Refresh interval**: co ile sekund odświeżać (default 60s)
- **Claude limits**: zmień jeśli masz inny plan niż Pro (Pro ≈ 45 turnów/5h)

## Pakowanie do `.streamDeckPlugin`
```bash
npm run pack
```
Tworzy `com.kupciu.ai-usage.streamDeckPlugin` — wyślij znajomym, dwuklik = instalacja.

## Znane ograniczenia

- **Claude %** jest orientacyjny — Anthropic nie publikuje dokładnych limitów. Default: Pro = 45 turnów/5h.
- **Codex dane** są tak stare jak ostatnia sesja Codexa — jeśli nie uruchamiasz go, widzisz stale dane.
- Plugin działa tylko na **Windows** (ścieżki USERPROFILE). Mac support = zmiana `homedir()` + rebuild.

## Struktura projektu

```
src/
  plugin.ts                    # entry point
  actions/
    base-action.ts             # timer, refresh, event handling
    claude-action.ts           # @action decorator + provider bind
    codex-action.ts
  providers/
    types.ts                   # UsageSnapshot, ActionSettings interfaces
    claude-provider.ts         # JSONL parser + rolling window math
    codex-provider.ts          # JSONL parser, reads server rate_limits
  core/
    jsonl-reader.ts            # streaming JSONL line reader
    session-blocks.ts          # 5h/7d window computation
  render/
    button-canvas.ts           # 144x144 PNG: %, bar, countdown
com.kupciu.ai-usage.sdPlugin/
  manifest.json
  ui/property-inspector.html
  imgs/
```
