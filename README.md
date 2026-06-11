# CANDLE — the daily market-reading puzzle

**Play it live: <https://candles.gamestheory.org>**

One price chart a day, the same for everyone. Read the trend, momentum and
volatility, then call whether the next candle closes **green (bull)** or
**red (bear)**. Six calls per day. Beat the market (4/6+) to keep your streak,
then share your result as emoji squares — Wordle, for markets.

**v2 — the indicator toolkit.** The chart now ships with a real technical
toolbox, computed with textbook formulas and zero lookahead:

- **SMA20 / EMA9** moving-average overlays (trend + crossovers)
- **RSI(14)** (Wilder) sub-panel with 30/70 bands
- **MACD(12,26,9)** sub-panel (line, signal, histogram)
- **Volume** bars with a 10-period average line
- **Support / resistance** detected from swing pivots, clustered by ATR(14)

After **every** round the game explains itself: each indicator's reading at
the moment of your call, whether it pointed the right way (✓/✗), and an
honest verdict — including "your read was right and the market broke the
pattern anyway", because that's how markets actually work. **Practice mode**
is unlimited with difficulty levels (pure price action → averages → momentum
→ full pro toolkit). UI is bilingual (EN/PL, auto-detected, switchable).

It's a **single static web app**: HTML + CSS + JS, no build step, no backend,
no third-party code, no network calls. That makes it trivial to host and gives
it essentially **no attack surface**.

---

## Run it locally

Because of the service worker and module-free setup, just opening
`index.html` from disk mostly works, but a tiny static server is better
(service worker + clipboard behave correctly over `http://localhost`):

```powershell
# any one of these, from inside the candle/ folder
python -m http.server 8000
# or
npx --yes serve .
```

Then open <http://localhost:8000>.

> Opening via `file://` works for the game itself, but the service worker
> (offline mode) only registers on `https://` or `localhost` by design.

---

## Deploy it to the world

It's static files, so any static host works. Pick one:

### GitHub Pages
1. Push this `candle/` folder to a repo.
2. Settings → Pages → deploy from branch → `/root` (or move files to repo root).
3. Done — `https://<user>.github.io/<repo>/`.

### Netlify / Vercel / Cloudflare Pages
- Drag-and-drop the folder, or point the project at the repo.
- No build command. Publish directory = the folder containing `index.html`.

### Any web server
Copy the folder into your web root. That's it.

### Recommended response headers (host-level)
The app ships a strict `Content-Security-Policy` via `<meta>`, but set these at
the host for defence-in-depth:

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), camera=(), microphone=(), interest-cohort=()
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

---

## How it works

- **Deterministic daily chart.** The puzzle number is the day index since
  2026-01-01. A string seed (`candle-daily-<n>`) is hashed (xmur3) into a
  PRNG (mulberry32), so every player worldwide gets the identical chart and
  can compare scores.
- **Real market dynamics.** Returns follow an AR(1)-style process with
  momentum, gentle drift and mean reversion toward the starting level —
  charts trend and revert like real ones, so *reading them genuinely beats a
  coin flip*. It's skill, not a slot machine.
- **Local-only state.** Stats, streaks and your daily progress live in
  `localStorage` on your device. Nothing is uploaded. Corrupt or tampered
  storage is validated and falls back to safe defaults.
- **Offline / installable.** A service worker caches the app shell; the
  manifest makes it installable as a PWA.

## Customising

- Difficulty / length: `CONFIG` at the top of `app.js`
  (`HISTORY`, `ROUNDS`, `PASS`).
- Branding/colours: CSS custom properties at the top of `styles.css`.
- When you change `app.js`/`styles.css`, bump `CACHE` in `sw.js` so returning
  players get the update.

## A note on "addictive"

This is built to be **engaging through fair, transparent, skill-based
mechanics**: one puzzle a day (naturally self-limiting), a streak you earn,
and a shareable result. It deliberately avoids manipulative dark patterns —
no infinite feed, no loot boxes, no fake-urgency timers, no data harvesting.

This is a game. It is **not financial advice.**

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) — Copyright Kacper (2026).
Free to use, share and modify for any noncommercial purpose. For commercial
licensing inquiries, contact the copyright holder.
