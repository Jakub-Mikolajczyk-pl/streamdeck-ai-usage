# AI Usage Limits — Stream Deck Plugin

Pokazuje zużycie limitów **Claude Code** i **Codex CLI** bezpośrednio na klawiszach Stream Decka.
**Brak API keys. Brak sieci. Tylko lokalne pliki.**

![demo placeholder](docs/demo.png)

## Co robi

| Klawisz | Źródło danych | Co liczy |
|---|---|---|
| **Claude** | `~/.claude/projects/**/*.jsonl` | Suma billable tokenów (input + output + cache_creation) w oknach 5h / 7d |
| **Codex** | `~/.codex/sessions/**/*.jsonl` | Server-zwracane `used_percent` z najnowszej sesji (5h primary + 7d secondary) |

- Klik na klawisz → natychmiastowe odświeżenie.
- Kolory: Codex zawsze niebieski, Claude w gradiencie 🟢 < 60% → 🟡 60-85% → 🔴 > 85%.
- Reset countdown na dole klawisza (np. `↺ 3h24m`).
- Jeśli dane Codex są stare i okno już się odnowiło → pokazujemy 0%.

## Architektura

Hexagonal split:

```
src/
  plugin.ts                    # entry point + crash logging (opt-in via env)
  actions/                     # USE-CASES — bind Stream Deck events to providers
    base-action.ts             # timer, refresh, settings merge
    claude-action.ts           # @action decorator → provider bind
    codex-action.ts
  providers/                   # PORTS — domain layer
    types.ts                   # UsageSnapshot, ActionSettings, defaults
    claude-provider.ts         # JSONL scan + rolling-window sum
    codex-provider.ts          # JSONL scan + read server rate_limits
  core/                        # shared utilities
    find-jsonl.ts              # recursive *.jsonl finder + mtime filter
    jsonl-reader.ts            # streaming line-by-line JSONL parser
    session-blocks.ts          # 5h / 7d window math
  render/                      # ADAPTER — output side
    button-canvas.ts           # 144×144 PNG: %, bar, countdown
com.kupciu.ai-usage.sdPlugin/  # the plugin bundle as Stream Deck sees it
  manifest.json
  package.json                 # {"type":"commonjs"} — required for our bundle
  ui/property-inspector.html
  imgs/
```

Adding a third provider (Gemini, Cursor, …) means: write a new `*-provider.ts`,
register its action in `plugin.ts`, declare it in `manifest.json`.

## Build & install (development)

### Wymagania
- Node.js ≥ 20 (system Node — only used to build, not at runtime)
- Stream Deck desktop app ≥ 6.5 (z Node runtime 20.20.0 wbudowanym)
- Stream Deck **Plugin Developer Mode** włączony — `Settings → Advanced` w aplikacji,
  potrzebny żeby `streamdeck link/restart` mogło działać
- `@elgato/cli`: `npm install -g @elgato/cli`

### Krok 1 — install deps
```bash
cd E:\repo\streamdeck-ai-usage
npm install
```

### Krok 2 — build
```bash
npm run build
```
Co robi: esbuild bundluje `src/` → `com.kupciu.ai-usage.sdPlugin/bin/plugin.js` (CJS, single file).
Następnie kopiuje `@napi-rs/canvas` + native binding `.node` do plugin folderu (Stream Deck używa swojego Node z `--no-global-search-paths`, więc node_modules muszą być wewnątrz `sdPlugin/`). Pre-tworzy też `logs/` żeby ominąć race condition w SDK.

### Krok 3 — link do Stream Decka
```bash
streamdeck link com.kupciu.ai-usage.sdPlugin
```
Tworzy junction w `%APPDATA%\Elgato\StreamDeck\Plugins\`.

### Krok 4 — restart Stream Decka
Najprościej: kill the desktop app from tray and reopen. Alternatywnie z dev mode włączonym:
```bash
streamdeck restart com.kupciu.ai-usage
```

### Krok 5 — dodaj akcje
W Stream Deck → biblioteka akcji (prawa strona) → kategoria **AI Usage** → przeciągnij **Claude Usage** / **Codex Usage** na klawisz.

### Krok 6 — kalibracja Claude
Anthropic nie publikuje dokładnych limitów. W **Property Inspector** dla klawisza Claude
ustaw token budgety porównując % na klawiszu z % w Claude Code (`/status` lub status line).
Defaulty dla Pro to ~4.5M / 5h i ~28M / 7d.

## Debugowanie
Plugin pisze tylko do plików — żeby zobaczyć błędy startu, ustaw zmienną
środowiskową **przed** uruchomieniem Stream Decka:
```powershell
$env:SD_AI_USAGE_DEBUG = "1"
```
Logi: `%TEMP%\sd-ai-usage-debug.log`.

Plus logi runtime SDK trafiają do `com.kupciu.ai-usage.sdPlugin\logs\`.

## Pakowanie
```bash
npm run pack
```
Tworzy `com.kupciu.ai-usage.streamDeckPlugin` — dwuklik = instalacja na cudzej maszynie.

## Lessons learned (notatka dla autora i przyszłych pluginów)

1. **`Nodejs` w manifest jest WYMAGANE** — bez tego pola Stream Deck nie wie że to plugin Node i nigdy nie uruchomi procesu, mimo że plugin pojawia się w UI.
2. **SDK ma race condition w `FileTarget.reIndex`** — `mkdirSync` bez `{recursive: true}` na folderze `logs/`. Workaround: pre-tworzyć folder w build script.
3. **Stream Deck używa swojego Node 20.20.0** z `--no-global-search-paths` — `node_modules` muszą być wewnątrz `sdPlugin/`, a nie w parencie repo. Stąd kopia w build.mjs.
4. **CJS, nie ESM** — `ws` (zależność SDK) dynamicznie `require('events')`, co esbuild w trybie ESM zamienia na `__require` shim który nie wspiera builtinów. Bundle musi być CJS, więc `sdPlugin/package.json` ma `"type": "commonjs"`.
5. **Codex `used_percent` jest 0-100, nie 0-1** — łatwy do przeoczenia, bo wartość wygląda jak ułamek (np. `0.0` / `1.0` / `2`), ale to procenty.
6. **Claude nie wystawia rate-limit data lokalnie** — IDE robi to z headerów API w pamięci. Jedyne co możemy to liczyć tokeny i porównywać z konfigurowalnym limitem.

## Licencja
MIT — patrz [LICENSE](LICENSE).

## Marketplace deploy
Patrz [MARKETPLACE.md](MARKETPLACE.md).
