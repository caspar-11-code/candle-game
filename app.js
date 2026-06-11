/* ============================================================
   CANDLE — daily market-reading puzzle (v2: indicator toolkit)
   Pure client-side, no dependencies, no network.

   v2 adds: SMA20/EMA9 overlays, RSI(14), MACD(12,26,9),
   volume, auto support/resistance, practice levels and a
   per-round educational analysis — all computed with the
   standard textbook formulas and zero lookahead.
   ============================================================ */
"use strict";

(function () {
  /* ---------------- Config ---------------- */
  const CONFIG = {
    WARMUP: 50, // generated but never shown — lets RSI/MACD stabilise
    HISTORY: 24, // candles visible before the first call
    ROUNDS: 6, // number of predictions
    PASS: 4, // correct calls needed to "beat the market"
    EPOCH: new Date(2026, 0, 1), // local date of puzzle #1
  };
  const VISIBLE = CONFIG.HISTORY + CONFIG.ROUNDS; // chart window width in candles
  const GEN_TOTAL = CONFIG.WARMUP + VISIBLE;
  const VIS_START = CONFIG.WARMUP; // absolute index of first visible candle

  const ALL_INDS = ["ma", "vol", "rsi", "macd", "sr"];
  const LEVELS = [
    { id: 1, inds: [] },
    { id: 2, inds: ["ma"] },
    { id: 3, inds: ["ma", "vol", "rsi"] },
    { id: 4, inds: ["ma", "vol", "rsi", "macd", "sr"] },
  ];

  const KEYS = {
    stats: "candle.stats.v1",
    prefs: "candle.prefs.v1",
    daily: (n) => `candle.daily.v2.${n}`, // v2: new generator => new charts
  };

  /* ---------------- i18n ---------------- */
  const STR = {
    en: {
      tab_daily: "Daily",
      tab_practice: "Practice",
      lv_1: "Pure price",
      lv_2: "+ Averages",
      lv_3: "+ Momentum",
      lv_4: "Pro",
      question_html:
        'Will the next candle close <strong class="up">green</strong> or <strong class="down">red</strong>?',
      bull_hint: "close up",
      bear_hint: "close down",
      score_label: "Score",
      fb_correct: "Correct — closed {word}.",
      fb_wrong: "Missed — closed {word}.",
      w_green: "green (bull)",
      w_red: "red (bear)",
      w_greens: "green",
      w_reds: "red",
      word_up: "the upside (BULL)",
      word_down: "the downside (BEAR)",
      practice_sub: "Training — fresh chart, does not affect stats",
      analysis_title: "Round {n} — what the chart was saying",
      an_correct_with: "Good call — the signals backed you up.",
      an_correct_mixed: "Good instinct — the signals were mixed, you read it anyway.",
      an_correct_against:
        "Bold — you went against the signals and the market proved you right. Don't make a habit of it. 😉",
      an_wrong_signals:
        "The toolkit leaned toward {word} — your call went the other way. See the breakdown below.",
      an_wrong_luck:
        "Your call matched the signals — the market simply broke the pattern this time. That's trading: think in probabilities, not certainties.",
      an_wrong_mixed:
        "Signals were genuinely mixed — that was near coin-flip territory. Skipping unclear setups is a skill too.",
      an_lead: "Signal consensus: {txt}",
      lead_up: "leaning bullish ({s})",
      lead_down: "leaning bearish ({s})",
      lead_flat: "neutral (0)",
      an_hit: "pointed the right way",
      an_miss: "pointed the wrong way",
      an_flat: "no direction",
      sig_trend_up: "Uptrend — EMA9 above SMA20 and price above the averages",
      sig_trend_down: "Downtrend — EMA9 below SMA20 and price below the averages",
      sig_trend_mixed: "Averages intertwined — no clear trend",
      sig_rsi_ob:
        "RSI {v} — overbought: pullback risk grows (though strong trends can stay hot for a while)",
      sig_rsi_os: "RSI {v} — oversold: bounce odds grow",
      sig_rsi_bull: "RSI {v} — bullish momentum zone (55–70)",
      sig_rsi_bear: "RSI {v} — bearish momentum zone (30–45)",
      sig_rsi_flat: "RSI {v} — neutral",
      sig_macd_bull: "MACD histogram positive and rising — upward momentum building",
      sig_macd_bear: "MACD histogram negative and falling — downward momentum building",
      sig_macd_fadeup: "MACD histogram still positive but shrinking — the up-move is losing steam",
      sig_macd_fadedown: "MACD histogram still negative but rising — the down-move is losing steam",
      sig_macd_flat: "MACD flat — little momentum either way",
      sig_sr_res: "Price sits just under resistance ≈{lvl} — rejections are common here unless it breaks out",
      sig_sr_sup: "Price sits just above support ≈{lvl} — bounces are common here unless it breaks down",
      sig_sr_none: "No key support/resistance level nearby",
      sig_vol_conf: "Volume well above average — real conviction behind the last {color} candle",
      sig_vol_low: "Volume below average — weak conviction, moves fade easily",
      sig_vol_norm: "Volume around average — no extra signal",
      sig_streak:
        "{n} {color} candles in a row — momentum often carries on, but stretched runs love to snap back",
      headline_6: "Flawless read. 🏆",
      headline_5: "Sharp eye. 📈",
      headline_4: "You beat the market. ✅",
      headline_3: "So close. 📉",
      headline_2: "Rough session.",
      headline_1: "The market won today.",
      headline_0: "Brutal. Hit practice mode.",
      res_title: "Round complete",
      res_share: "Share result",
      res_practice: "Practice mode",
      res_next: "Next daily in",
      mini_streak: "Streak",
      mini_max: "Max",
      mini_win: "Win %",
      mini_mode: "Mode",
      mini_practice: "Practice",
      stats_title: "Statistics",
      st_played: "played",
      st_beat: "% beat",
      st_streak: "streak",
      st_max: "max streak",
      dist_title: "Score distribution",
      help_title: "How to play",
      footer_note:
        "Skill, not luck — but the market always gets the last word. Scores stay on your device. Not financial advice.",
      footer_how: "How it works",
      ann_correct: "Correct.",
      ann_wrong: "Wrong.",
      ann_practice: "Practice round started.",
      share_copied: "Copied to clipboard!",
      share_failed: "Copy failed — select & copy",
      help_html: `
        <p>Each day brings <strong>one chart</strong> — the same for everyone. Read it, then call whether the next candle closes <span class="up">green</span> (BULL) or <span class="down">red</span> (BEAR). Six calls per day; score <strong>4/6 or better</strong> to beat the market and keep your streak.</p>
        <h3>Your toolkit</h3>
        <ul>
          <li><strong>MA — moving averages.</strong> <span class="kbd">SMA20</span> (orange) shows the slow trend, <span class="kbd">EMA9</span> (blue) reacts faster. Fast above slow with price above both = uptrend; the reverse = downtrend.</li>
          <li><strong>RSI(14).</strong> Momentum from 0–100. Above 70 = overbought (pullback risk), below 30 = oversold (bounce odds), around 50 = neutral.</li>
          <li><strong>MACD(12,26,9).</strong> The momentum engine. Histogram above zero and growing = bulls accelerating; shrinking histogram = the move is running out of fuel.</li>
          <li><strong>S/R — support &amp; resistance.</strong> Dashed lines mark levels where price turned before. Approaches often bounce; clean breaks often run.</li>
          <li><strong>Volume.</strong> Tall bars = conviction behind the move. A push on weak volume is easy to distrust.</li>
        </ul>
        <p><strong>Practice mode</strong> is unlimited and has levels — start with pure price action, add tools as you learn. After <em>every</em> round you get a breakdown of what the indicators were saying and why your call worked or didn't.</p>
        <p class="muted">Keyboard: <span class="kbd">↑</span>/<span class="kbd">B</span> = bull, <span class="kbd">↓</span>/<span class="kbd">S</span> = bear. Indicators give probabilities, not promises — that's the whole lesson. This is a game, not financial advice.</p>`,
    },
    pl: {
      tab_daily: "Dzienna",
      tab_practice: "Trening",
      lv_1: "Czysta cena",
      lv_2: "+ Średnie",
      lv_3: "+ Momentum",
      lv_4: "Pro",
      question_html:
        'Czy następna świeca zamknie się <strong class="up">na zielono</strong> czy <strong class="down">na czerwono</strong>?',
      bull_hint: "zamknięcie wyżej",
      bear_hint: "zamknięcie niżej",
      score_label: "Wynik",
      fb_correct: "Trafione — zamknięcie {word}.",
      fb_wrong: "Pudło — zamknięcie {word}.",
      w_green: "na zielono (byk)",
      w_red: "na czerwono (niedźwiedź)",
      w_greens: "zielonych",
      w_reds: "czerwonych",
      word_up: "wzrostów (BULL)",
      word_down: "spadków (BEAR)",
      practice_sub: "Trening — świeży wykres, nie wpływa na statystyki",
      analysis_title: "Runda {n} — co mówił wykres",
      an_correct_with: "Dobre odczytanie — wskaźniki to potwierdzały.",
      an_correct_mixed: "Dobry instynkt — sygnały były mieszane, a mimo to trafiłeś.",
      an_correct_against:
        "Odważnie — zagrałeś wbrew wskaźnikom i rynek przyznał Ci rację. Nie rób z tego nawyku. 😉",
      an_wrong_signals:
        "Wskaźniki przeważały w stronę {word} — Twój wybór poszedł w drugą. Zobacz rozbicie poniżej.",
      an_wrong_luck:
        "Twój wybór zgadzał się ze wskaźnikami — rynek po prostu złamał tym razem schemat. Tak działa giełda: myśl prawdopodobieństwami, nie pewnikami.",
      an_wrong_mixed:
        "Sygnały były naprawdę mieszane — to był niemal rzut monetą. Odpuszczanie niejasnych okazji to też umiejętność.",
      an_lead: "Wypadkowa sygnałów: {txt}",
      lead_up: "przewaga byków ({s})",
      lead_down: "przewaga niedźwiedzi ({s})",
      lead_flat: "neutralna (0)",
      an_hit: "wskazywał dobrze",
      an_miss: "wskazywał błędnie",
      an_flat: "bez kierunku",
      sig_trend_up: "Trend wzrostowy — EMA9 nad SMA20, cena powyżej średnich",
      sig_trend_down: "Trend spadkowy — EMA9 pod SMA20, cena poniżej średnich",
      sig_trend_mixed: "Średnie splecione — brak wyraźnego trendu",
      sig_rsi_ob:
        "RSI {v} — wykupienie: rośnie ryzyko korekty (choć w silnym trendzie RSI potrafi długo zostać wysoko)",
      sig_rsi_os: "RSI {v} — wyprzedanie: rośnie szansa odbicia",
      sig_rsi_bull: "RSI {v} — strefa byczego momentum (55–70)",
      sig_rsi_bear: "RSI {v} — strefa niedźwiedziego momentum (30–45)",
      sig_rsi_flat: "RSI {v} — neutralnie",
      sig_macd_bull: "Histogram MACD dodatni i rosnący — momentum wzrostowe przybiera",
      sig_macd_bear: "Histogram MACD ujemny i malejący — momentum spadkowe przybiera",
      sig_macd_fadeup: "Histogram MACD wciąż dodatni, ale maleje — ruch w górę traci impet",
      sig_macd_fadedown: "Histogram MACD wciąż ujemny, ale rośnie — ruch w dół traci impet",
      sig_macd_flat: "MACD płasko — brak wyraźnego momentum",
      sig_sr_res: "Cena tuż pod oporem ≈{lvl} — częste odbicia w dół, chyba że dojdzie do wybicia",
      sig_sr_sup: "Cena tuż nad wsparciem ≈{lvl} — częste odbicia w górę, chyba że pęknie wsparcie",
      sig_sr_none: "Brak istotnego wsparcia/oporu w pobliżu",
      sig_vol_conf: "Wolumen wyraźnie powyżej średniej — za ostatnią świecą ({color}) stoi przekonanie",
      sig_vol_low: "Wolumen poniżej średniej — słabe przekonanie, ruch łatwo gaśnie",
      sig_vol_norm: "Wolumen w okolicy średniej — bez dodatkowego sygnału",
      sig_streak:
        "{n} {color} świec z rzędu — momentum często niesie dalej, ale rozciągnięte serie lubią się cofać",
      headline_6: "Bezbłędny odczyt. 🏆",
      headline_5: "Sokole oko. 📈",
      headline_4: "Pokonujesz rynek. ✅",
      headline_3: "O włos. 📉",
      headline_2: "Ciężka sesja.",
      headline_1: "Dziś wygrał rynek.",
      headline_0: "Brutalnie. Wskocz do treningu.",
      res_title: "Runda zakończona",
      res_share: "Udostępnij wynik",
      res_practice: "Tryb treningowy",
      res_next: "Nowa dzienna za",
      mini_streak: "Seria",
      mini_max: "Maks",
      mini_win: "% wygranych",
      mini_mode: "Tryb",
      mini_practice: "Trening",
      stats_title: "Statystyki",
      st_played: "rozegrane",
      st_beat: "% wygranych",
      st_streak: "seria",
      st_max: "maks. seria",
      dist_title: "Rozkład wyników",
      help_title: "Jak grać",
      footer_note:
        "Umiejętności, nie szczęście — ale ostatnie słowo zawsze należy do rynku. Wyniki zostają na Twoim urządzeniu. To nie jest porada inwestycyjna.",
      footer_how: "Jak to działa",
      ann_correct: "Trafione.",
      ann_wrong: "Pudło.",
      ann_practice: "Runda treningowa rozpoczęta.",
      share_copied: "Skopiowano do schowka!",
      share_failed: "Kopiowanie nie wyszło — zaznacz i skopiuj",
      help_html: `
        <p>Każdego dnia dostajesz <strong>jeden wykres</strong> — ten sam dla wszystkich. Odczytaj go i oceń, czy następna świeca zamknie się <span class="up">na zielono</span> (BULL) czy <span class="down">na czerwono</span> (BEAR). Sześć typów dziennie; wynik <strong>4/6 lub lepszy</strong> pokonuje rynek i podtrzymuje Twoją serię.</p>
        <h3>Twój zestaw narzędzi</h3>
        <ul>
          <li><strong>MA — średnie kroczące.</strong> <span class="kbd">SMA20</span> (pomarańczowa) pokazuje wolny trend, <span class="kbd">EMA9</span> (niebieska) reaguje szybciej. Szybka nad wolną i cena nad obiema = trend wzrostowy; odwrotnie = spadkowy.</li>
          <li><strong>RSI(14).</strong> Momentum w skali 0–100. Powyżej 70 = wykupienie (ryzyko korekty), poniżej 30 = wyprzedanie (szansa odbicia), okolice 50 = neutralnie.</li>
          <li><strong>MACD(12,26,9).</strong> Silnik momentum. Histogram nad zerem i rosnący = byki przyspieszają; malejący histogram = ruch traci paliwo.</li>
          <li><strong>S/R — wsparcia i opory.</strong> Przerywane linie to poziomy, na których cena już wcześniej zawracała. Podejścia często się odbijają, czyste wybicia często kontynuują ruch.</li>
          <li><strong>Wolumen.</strong> Wysokie słupki = przekonanie za ruchem. Ruch na słabym wolumenie łatwo podważyć.</li>
        </ul>
        <p><strong>Tryb treningowy</strong> jest nielimitowany i ma poziomy — zacznij od czystej price action i dokładaj narzędzia w miarę nauki. Po <em>każdej</em> rundzie dostajesz rozbicie: co mówiły wskaźniki i dlaczego Twój typ zadziałał albo nie.</p>
        <p class="muted">Klawiatura: <span class="kbd">↑</span>/<span class="kbd">B</span> = bull, <span class="kbd">↓</span>/<span class="kbd">S</span> = bear. Wskaźniki dają prawdopodobieństwa, nie obietnice — i to jest cała lekcja. To gra, nie porada inwestycyjna.</p>`,
    },
  };

  /* ---------------- Tiny utilities ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const SVGNS = "http://www.w3.org/2000/svg";

  function svg(name, attrs, parent) {
    const e = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  }

  function clampInt(v, min, max) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function fmtPrice(p) {
    return p >= 100 ? p.toFixed(1) : p.toFixed(2);
  }

  /* ---------------- Seeded RNG ---------------- */
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seedStr) {
    return mulberry32(xmur3(seedStr)());
  }
  function gaussian(rand) {
    let u = 0,
      v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------------- Market model ----------------
     AR(1)-style returns: momentum (phi), mild drift and mean
     reversion toward the start level. Volume is synthesised so
     impulse candles carry more volume — like real tape. */
  function generateSeries(seedStr) {
    const rand = makeRng(seedStr);
    const candles = [];

    const base = 80 + rand() * 120;
    let price = base;
    const drift = (rand() - 0.5) * 0.0016;
    const vol = 0.012 + rand() * 0.022;
    const phi = rand() * 0.9 - 0.3;
    const reversion = 0.01 + rand() * 0.02;

    let prevRet = 0;
    for (let i = 0; i < GEN_TOTAL; i++) {
      const open = price;
      const pull = Math.log(base / price) * reversion;
      const noise = gaussian(rand) * vol;
      let ret = drift + phi * prevRet + noise + pull;
      ret = Math.max(-0.12, Math.min(0.12, ret));
      prevRet = ret;

      let close = open * (1 + ret);
      if (close <= 1) close = 1 + rand();

      const span = Math.abs(close - open);
      const high = Math.max(open, close) + span * (0.2 + rand() * 0.9) + open * vol * 0.15 * rand();
      const low = Math.min(open, close) - span * (0.2 + rand() * 0.9) - open * vol * 0.15 * rand();

      // impulse moves print more volume
      const volume = Math.round(40 + 1500 * Math.min(0.06, Math.abs(ret)) + 35 * rand());

      candles.push({
        open,
        close,
        high,
        low: Math.max(0.5, low),
        bull: close >= open,
        volume,
      });
      price = close;
    }
    return candles;
  }

  /* ---------------- Indicators (textbook formulas) ---------------- */
  function smaArr(vals, n) {
    const out = new Array(vals.length).fill(null);
    let sum = 0;
    for (let i = 0; i < vals.length; i++) {
      sum += vals[i];
      if (i >= n) sum -= vals[i - n];
      if (i >= n - 1) out[i] = sum / n;
    }
    return out;
  }

  function emaArr(vals, n) {
    const out = new Array(vals.length).fill(null);
    if (vals.length < n) return out;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += vals[i];
    let prev = sum / n;
    out[n - 1] = prev;
    const k = 2 / (n + 1);
    for (let i = n; i < vals.length; i++) {
      prev = vals[i] * k + prev * (1 - k);
      out[i] = prev;
    }
    return out;
  }

  // Wilder's RSI
  function rsiArr(closes, n) {
    const out = new Array(closes.length).fill(null);
    if (closes.length <= n) return out;
    let g = 0,
      l = 0;
    for (let i = 1; i <= n; i++) {
      const d = closes[i] - closes[i - 1];
      if (d >= 0) g += d;
      else l -= d;
    }
    let ag = g / n,
      al = l / n;
    out[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = n + 1; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      ag = (ag * (n - 1) + Math.max(0, d)) / n;
      al = (al * (n - 1) + Math.max(0, -d)) / n;
      out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return out;
  }

  function macdCalc(closes, fast, slow, sigN) {
    const ef = emaArr(closes, fast);
    const es = emaArr(closes, slow);
    const line = closes.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
    const signal = new Array(closes.length).fill(null);
    const start = line.findIndex((v) => v != null);
    if (start >= 0 && start + sigN <= closes.length) {
      let sum = 0;
      for (let i = start; i < start + sigN; i++) sum += line[i];
      let prev = sum / sigN;
      signal[start + sigN - 1] = prev;
      const k = 2 / (sigN + 1);
      for (let i = start + sigN; i < closes.length; i++) {
        prev = line[i] * k + prev * (1 - k);
        signal[i] = prev;
      }
    }
    const hist = line.map((v, i) => (v != null && signal[i] != null ? v - signal[i] : null));
    return { line, signal, hist };
  }

  // Wilder's ATR — used to scale support/resistance tolerances
  function atrArr(series, n) {
    const out = new Array(series.length).fill(null);
    if (series.length <= n) return out;
    const trs = [series[0].high - series[0].low];
    for (let i = 1; i < series.length; i++) {
      const c = series[i],
        p = series[i - 1];
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    }
    let sum = 0;
    for (let i = 1; i <= n; i++) sum += trs[i];
    let prev = sum / n;
    out[n] = prev;
    for (let i = n + 1; i < series.length; i++) {
      prev = (prev * (n - 1) + trs[i]) / n;
      out[i] = prev;
    }
    return out;
  }

  function computeIndicators(series) {
    const closes = series.map((c) => c.close);
    const vols = series.map((c) => c.volume);
    return {
      sma20: smaArr(closes, 20),
      ema9: emaArr(closes, 9),
      rsi14: rsiArr(closes, 14),
      macd: macdCalc(closes, 12, 26, 9),
      volAvg10: smaArr(vols, 10),
      atr14: atrArr(series, 14),
    };
  }

  /* ---------------- Support / resistance ----------------
     Swing pivots (2 candles each side) inside the revealed
     window, clustered by an ATR-scaled tolerance. Pivots use
     only already-revealed candles — zero lookahead. */
  function findLevels(series, startAbs, endAbs, tol) {
    const piv = [];
    for (let i = startAbs + 2; i <= endAbs - 2; i++) {
      const h = series[i].high,
        l = series[i].low;
      if (
        h >= series[i - 1].high && h >= series[i - 2].high &&
        h >= series[i + 1].high && h >= series[i + 2].high
      )
        piv.push(h);
      if (
        l <= series[i - 1].low && l <= series[i - 2].low &&
        l <= series[i + 1].low && l <= series[i + 2].low
      )
        piv.push(l);
    }
    piv.sort((a, b) => a - b);
    const clusters = [];
    for (const p of piv) {
      const last = clusters[clusters.length - 1];
      if (last && p - last.sum / last.n <= tol) {
        last.sum += p;
        last.n++;
      } else {
        clusters.push({ sum: p, n: 1 });
      }
    }
    return clusters.map((c) => ({ price: c.sum / c.n, touches: c.n }));
  }

  /* ---------------- Dates / puzzle number ---------------- */
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function puzzleNumberFor(date) {
    return Math.floor((startOfDay(date) - CONFIG.EPOCH) / 86400000) + 1;
  }
  function formatDate(date) {
    try {
      return date.toLocaleDateString(prefs.lang === "pl" ? "pl-PL" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date.toDateString();
    }
  }

  /* ---------------- Safe storage ---------------- */
  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {
        /* private mode / quota — game still works in-memory */
      }
    },
  };

  function defaultStats() {
    return {
      played: 0,
      passes: 0,
      perfect: 0,
      totalCorrect: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastNumber: null,
      dist: [0, 0, 0, 0, 0, 0, 0],
    };
  }
  function normalizeStats(raw) {
    const d = defaultStats();
    if (!raw || typeof raw !== "object") return d;
    d.played = clampInt(raw.played, 0, 1e9);
    d.passes = clampInt(raw.passes, 0, 1e9);
    d.perfect = clampInt(raw.perfect, 0, 1e9);
    d.totalCorrect = clampInt(raw.totalCorrect, 0, 1e12);
    d.currentStreak = clampInt(raw.currentStreak, 0, 1e9);
    d.maxStreak = clampInt(raw.maxStreak, 0, 1e9);
    d.lastNumber = raw.lastNumber == null ? null : clampInt(raw.lastNumber, -1e9, 1e9);
    if (Array.isArray(raw.dist) && raw.dist.length === 7) {
      d.dist = raw.dist.map((x) => clampInt(x, 0, 1e9));
    }
    return d;
  }

  function defaultPrefs() {
    const nav = (navigator.language || "").toLowerCase();
    return {
      sound: true,
      theme: "dark",
      seenHelp: false,
      lang: nav.startsWith("pl") ? "pl" : "en",
      practiceLevel: 1,
      indOn: { ma: true, vol: true, rsi: true, macd: true, sr: true },
    };
  }
  function normalizePrefs(raw) {
    const d = defaultPrefs();
    if (!raw || typeof raw !== "object") return d;
    d.sound = raw.sound !== false;
    d.theme = raw.theme === "light" ? "light" : "dark";
    d.seenHelp = raw.seenHelp === true;
    d.lang = raw.lang === "pl" ? "pl" : raw.lang === "en" ? "en" : d.lang;
    d.practiceLevel = clampInt(raw.practiceLevel, 1, LEVELS.length) || 1;
    if (raw.indOn && typeof raw.indOn === "object") {
      for (const k of ALL_INDS) d.indOn[k] = raw.indOn[k] !== false;
    }
    return d;
  }

  /* ---------------- Sound (Web Audio, lazy) ---------------- */
  const Sound = {
    ctx: null,
    ensure() {
      if (this.ctx) return this.ctx;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
      return this.ctx;
    },
    play(kind) {
      if (!prefs.sound) return;
      const ctx = this.ensure();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      const cfg =
        kind === "good"
          ? { f1: 523.25, f2: 783.99, dur: 0.18 }
          : kind === "bad"
          ? { f1: 311.13, f2: 196.0, dur: 0.22 }
          : { f1: 659.25, f2: 987.77, dur: 0.3 };
      o.frequency.setValueAtTime(cfg.f1, now);
      o.frequency.exponentialRampToValueAtTime(cfg.f2, now + cfg.dur);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + cfg.dur);
      o.start(now);
      o.stop(now + cfg.dur + 0.02);
    },
  };

  /* ---------------- State ---------------- */
  let stats = normalizeStats(Store.get(KEYS.stats, null));
  let prefs = normalizePrefs(Store.get(KEYS.prefs, null));

  let game = null; // {mode, number, series, ind, round, results, finished}
  let lastAnalysis = null; // {round, signals, consensus, userDir, actualDir}
  let practiceCounter = 0;
  let busy = false;
  let countdownTimer = null;

  function t(key, vars) {
    const pack = STR[prefs.lang] || STR.en;
    let s = pack[key] != null ? pack[key] : STR.en[key] != null ? STR.en[key] : key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]));
    return s;
  }

  /* ---------------- DOM refs ---------------- */
  const dom = {
    chartWrap: $("#chart-wrap"),
    chart: $("#chart"),
    rsiWrap: $("#wrap-rsi"),
    rsiPanel: $("#panel-rsi"),
    rsiVal: $("#rsi-val"),
    macdWrap: $("#wrap-macd"),
    macdPanel: $("#panel-macd"),
    macdVal: $("#macd-val"),
    modeWord: $("#mode-word"),
    number: $("#puzzle-number"),
    date: $("#puzzle-date"),
    progress: $("#progress"),
    bull: $("#btn-bull"),
    bear: $("#btn-bear"),
    score: $("#score"),
    feedback: $("#feedback"),
    live: $("#aria-live"),
    tabDaily: $("#tab-daily"),
    tabPractice: $("#tab-practice"),
    levelbar: $("#levelbar"),
    indbar: $("#indbar"),
    analysis: $("#analysis"),
    anTitle: $("#analysis-title"),
    anHeadline: $("#analysis-headline"),
    anLead: $("#analysis-lead"),
    anList: $("#analysis-list"),
    help: $("#modal-help"),
    helpBody: $("#help-body"),
    stats: $("#modal-stats"),
    result: $("#modal-result"),
    resultHeadline: $("#result-headline"),
    resultScore: $("#result-score"),
    resultGrid: $("#result-grid"),
    resultMini: $("#result-mini"),
    countdown: $("#countdown"),
  };

  function announce(msg) {
    dom.live.textContent = "";
    window.requestAnimationFrame(() => (dom.live.textContent = msg));
  }

  /* ---------------- Indicator visibility ---------------- */
  function activeIndSet() {
    if (!game || game.mode === "daily") return new Set(ALL_INDS);
    return new Set(LEVELS[prefs.practiceLevel - 1].inds);
  }
  function displayedInds() {
    const act = activeIndSet();
    return new Set(ALL_INDS.filter((k) => act.has(k) && prefs.indOn[k]));
  }

  /* ---------------- Geometry helpers ---------------- */
  function revealedCount() {
    return game.finished ? VISIBLE : Math.min(VISIBLE, CONFIG.HISTORY + game.round);
  }
  function lastRevealedAbs() {
    return VIS_START + revealedCount() - 1;
  }

  function chartGeom() {
    const cw = dom.chartWrap.clientWidth || 720;
    const W = Math.max(310, Math.min(1100, cw));
    return { W, padL: 46, padR: 10 };
  }

  /* ---------------- Main chart ---------------- */
  function renderMain() {
    const c = dom.chart;
    while (c.firstChild) c.removeChild(c.firstChild);

    const shown = displayedInds();
    const { W, padL, padR } = chartGeom();
    const showVol = shown.has("vol");
    const priceH = Math.max(200, Math.min(330, Math.round(W * 0.4)));
    const volH = showVol ? Math.max(42, Math.round(priceH * 0.2)) : 0;
    const padT = 14,
      gap = showVol ? 8 : 0,
      padB = 6;
    const H = padT + priceH + gap + volH + padB;
    c.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const plotW = W - padL - padR;
    const slotW = plotW / VISIBLE;
    const nVis = revealedCount();
    const visible = game.series.slice(VIS_START, VIS_START + nVis);
    const ind = game.ind;

    // y-range from revealed candles only — no peeking at the future
    let min = Infinity,
      max = -Infinity;
    for (const k of visible) {
      if (k.low < min) min = k.low;
      if (k.high > max) max = k.high;
    }
    if (!isFinite(min) || !isFinite(max) || min === max) {
      min = (min || 100) * 0.98;
      max = (max || 100) * 1.02;
    }
    const span = max - min;
    min -= span * 0.07;
    max += span * 0.07;

    const yOf = (p) => padT + (1 - (p - min) / (max - min)) * priceH;
    const xC = (v) => padL + slotW * (v + 0.5); // v = visible index

    // gridlines + labels
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const p = min + ((max - min) * i) / ticks;
      const y = yOf(p);
      svg("line", { class: "gridline", x1: padL, y1: y, x2: W - padR, y2: y }, c);
      const lb = svg("text", { class: "axislabel", x: padL - 5, y: y + 3, "text-anchor": "end" }, c);
      lb.textContent = p.toFixed(p < 100 ? 1 : 0);
    }

    // history | live divider
    const divX = padL + slotW * CONFIG.HISTORY;
    svg("line", { class: "divider", x1: divX, y1: padT, x2: divX, y2: padT + priceH }, c);
    const dl = svg("text", { class: "divider-label", x: divX + 4, y: padT + 11 }, c);
    dl.textContent = "LIVE";

    // support / resistance
    if (shown.has("sr")) {
      const iLast = lastRevealedAbs();
      const atr = ind.atr14[iLast] || game.series[iLast].close * 0.02;
      const close = game.series[iLast].close;
      const levels = findLevels(game.series, VIS_START, iLast, atr * 0.8);
      const res = levels.filter((L) => L.price > close).sort((a, b) => a.price - b.price).slice(0, 2);
      const sup = levels.filter((L) => L.price <= close).sort((a, b) => b.price - a.price).slice(0, 2);
      for (const group of [res, sup]) {
        for (const L of group) {
          if (L.price < min || L.price > max) continue;
          const y = yOf(L.price);
          const cls = group === res ? "res" : "sup";
          svg("line", {
            class: `srline ${cls}${L.touches < 2 ? " weak" : ""}`,
            x1: padL,
            y1: y,
            x2: W - padR,
            y2: y,
          }, c);
          const lb = svg("text", { class: `sr-label ${cls}`, x: W - padR - 2, y: y - 3, "text-anchor": "end" }, c);
          lb.textContent = fmtPrice(L.price);
        }
      }
    }

    // volume block
    if (showVol) {
      const volTop = padT + priceH + gap;
      let vMax = 1;
      for (const k of visible) if (k.volume > vMax) vMax = k.volume;
      const bw = Math.max(2.5, slotW * 0.55);
      visible.forEach((k, v) => {
        const h = Math.max(1, (k.volume / vMax) * volH);
        svg("rect", {
          class: "volbar " + (k.bull ? "bull" : "bear"),
          x: xC(v) - bw / 2,
          y: volTop + volH - h,
          width: bw,
          height: h,
        }, c);
      });
      // volume average line
      const pts = [];
      visible.forEach((k, v) => {
        const a = ind.volAvg10[VIS_START + v];
        if (a != null) pts.push(`${xC(v).toFixed(1)},${(volTop + volH - (a / vMax) * volH).toFixed(1)}`);
      });
      if (pts.length > 1) svg("polyline", { class: "vol-avg", points: pts.join(" ") }, c);
      const vl = svg("text", { class: "legend lg-vol", x: padL + 4, y: volTop + 10 }, c);
      vl.textContent = "VOL";
    }

    // moving averages
    if (shown.has("ma")) {
      const mk = (arr, cls) => {
        const pts = [];
        for (let v = 0; v < nVis; v++) {
          const val = arr[VIS_START + v];
          if (val != null) pts.push(`${xC(v).toFixed(1)},${yOf(val).toFixed(1)}`);
        }
        if (pts.length > 1) svg("polyline", { class: "ma-line " + cls, points: pts.join(" ") }, c);
      };
      mk(ind.sma20, "ma-slow");
      mk(ind.ema9, "ma-fast");
      const l1 = svg("text", { class: "legend lg-slow", x: padL + 4, y: padT + 11 }, c);
      l1.textContent = "SMA20";
      const l2 = svg("text", { class: "legend lg-fast", x: padL + 52, y: padT + 11 }, c);
      l2.textContent = "EMA9";
    }

    // candles
    const bodyW = Math.max(3, slotW * 0.58);
    visible.forEach((k, v) => {
      const isNew = !game.finished && v === nVis - 1 && game.round > 0;
      const g = svg("g", { class: "candle " + (k.bull ? "bull" : "bear") + (isNew ? " candle--new" : "") }, c);
      const x = xC(v);
      svg("line", { class: "wick", x1: x, y1: yOf(k.high), x2: x, y2: yOf(k.low) }, g);
      const yT = yOf(Math.max(k.open, k.close));
      const yB = yOf(Math.min(k.open, k.close));
      svg("rect", { class: "body", x: x - bodyW / 2, y: yT, width: bodyW, height: Math.max(1.5, yB - yT), rx: 1.2 }, g);
    });

    // placeholder for the candle being called
    if (!game.finished && nVis < VISIBLE) {
      const px = xC(nVis);
      svg("rect", { class: "placeholder-band", x: px - slotW / 2, y: padT, width: slotW, height: priceH }, c);
      const q = svg("text", { class: "placeholder-q", x: px, y: padT + priceH / 2 }, c);
      q.textContent = "?";
    }

    // accessible description
    const last = visible[visible.length - 1];
    if (game.finished) {
      c.setAttribute("aria-label", `Final chart, ${VISIBLE} candles. Score ${score()} of ${CONFIG.ROUNDS}.`);
    } else {
      c.setAttribute(
        "aria-label",
        `Round ${game.round + 1} of ${CONFIG.ROUNDS}. ${nVis} candles. Last closed ${last.bull ? "green" : "red"}. Call the next candle.`
      );
    }
  }

  /* ---------------- RSI panel ---------------- */
  function renderRsi() {
    const c = dom.rsiPanel;
    while (c.firstChild) c.removeChild(c.firstChild);
    const { W, padL, padR } = chartGeom();
    const H = 86,
      padT = 6,
      padB = 6,
      h = H - padT - padB;
    c.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const slotW = (W - padL - padR) / VISIBLE;
    const xC = (v) => padL + slotW * (v + 0.5);
    const yOf = (val) => padT + (1 - val / 100) * h;

    // 30/70 bands + zone
    svg("rect", { class: "rsi-zone", x: padL, y: yOf(70), width: W - padL - padR, height: yOf(30) - yOf(70) }, c);
    for (const lvl of [70, 30]) {
      svg("line", { class: "rsi-band", x1: padL, y1: yOf(lvl), x2: W - padR, y2: yOf(lvl) }, c);
      const lb = svg("text", { class: "axislabel", x: padL - 5, y: yOf(lvl) + 3, "text-anchor": "end" }, c);
      lb.textContent = lvl;
    }

    const nVis = revealedCount();
    const pts = [];
    for (let v = 0; v < nVis; v++) {
      const val = game.ind.rsi14[VIS_START + v];
      if (val != null) pts.push(`${xC(v).toFixed(1)},${yOf(val).toFixed(1)}`);
    }
    if (pts.length > 1) svg("polyline", { class: "rsi-line", points: pts.join(" ") }, c);
  }

  /* ---------------- MACD panel ---------------- */
  function renderMacd() {
    const c = dom.macdPanel;
    while (c.firstChild) c.removeChild(c.firstChild);
    const { W, padL, padR } = chartGeom();
    const H = 86,
      padT = 6,
      padB = 6,
      h = H - padT - padB;
    c.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const slotW = (W - padL - padR) / VISIBLE;
    const xC = (v) => padL + slotW * (v + 0.5);

    const nVis = revealedCount();
    const { line, signal, hist } = game.ind.macd;
    let m = 0;
    for (let v = 0; v < nVis; v++) {
      const i = VIS_START + v;
      for (const arr of [line, signal, hist]) {
        if (arr[i] != null && Math.abs(arr[i]) > m) m = Math.abs(arr[i]);
      }
    }
    if (m === 0) m = 1;
    const mid = padT + h / 2;
    const yOf = (val) => mid - (val / m) * (h / 2 - 4);

    svg("line", { class: "zero-line", x1: padL, y1: mid, x2: W - padR, y2: mid }, c);

    const bw = Math.max(2, slotW * 0.5);
    for (let v = 0; v < nVis; v++) {
      const hv = hist[VIS_START + v];
      if (hv == null) continue;
      const y = yOf(hv);
      svg("rect", {
        class: "macd-hist " + (hv >= 0 ? "pos" : "neg"),
        x: xC(v) - bw / 2,
        y: Math.min(mid, y),
        width: bw,
        height: Math.max(1, Math.abs(y - mid)),
      }, c);
    }
    const mk = (arr, cls) => {
      const pts = [];
      for (let v = 0; v < nVis; v++) {
        const val = arr[VIS_START + v];
        if (val != null) pts.push(`${xC(v).toFixed(1)},${yOf(val).toFixed(1)}`);
      }
      if (pts.length > 1) svg("polyline", { class: cls, points: pts.join(" ") }, c);
    };
    mk(line, "macd-line");
    mk(signal, "sig-line");
  }

  /* ---------------- Readouts ---------------- */
  function updateReadouts() {
    const i = lastRevealedAbs();
    const r = game.ind.rsi14[i];
    dom.rsiVal.textContent = r == null ? "—" : Math.round(r);
    dom.rsiVal.className = "pane-val" + (r >= 70 ? " val-ob" : r <= 30 ? " val-os" : "");

    const hv = game.ind.macd.hist[i];
    if (hv == null) {
      dom.macdVal.textContent = "—";
      dom.macdVal.className = "pane-val";
    } else {
      const prev = game.ind.macd.hist[i - 1];
      const arrow = prev == null ? "" : hv >= prev ? " ↑" : " ↓";
      dom.macdVal.textContent = (hv >= 0 ? "+" : "") + hv.toFixed(2) + arrow;
      dom.macdVal.className = "pane-val " + (hv >= 0 ? "val-pos" : "val-neg");
    }
  }

  function renderCharts() {
    if (!game) return;
    const shown = displayedInds();
    dom.rsiWrap.hidden = !shown.has("rsi");
    dom.macdWrap.hidden = !shown.has("macd");
    renderMain();
    if (shown.has("rsi")) renderRsi();
    if (shown.has("macd")) renderMacd();
    updateReadouts();
  }

  /* ---------------- Signals (the teaching engine) ----------------
     Each signal: {tKey, vars?, dir: 1|-1|0, w} — text is resolved
     at render time so language switching re-translates history. */
  function computeSignals() {
    const i = lastRevealedAbs();
    const s = game.series;
    const ind = game.ind;
    const close = s[i].close;
    const shown = displayedInds();
    const out = [];

    if (shown.has("ma")) {
      const ef = ind.ema9[i],
        es = ind.sma20[i];
      if (ef != null && es != null) {
        if (ef > es && close > es) out.push({ tKey: "sig_trend_up", dir: 1, w: 2 });
        else if (ef < es && close < es) out.push({ tKey: "sig_trend_down", dir: -1, w: 2 });
        else out.push({ tKey: "sig_trend_mixed", dir: 0, w: 0 });
      }
    }

    if (shown.has("rsi")) {
      const v = ind.rsi14[i];
      if (v != null) {
        const r = Math.round(v);
        if (v >= 70) out.push({ tKey: "sig_rsi_ob", vars: { v: r }, dir: -1, w: 1 });
        else if (v <= 30) out.push({ tKey: "sig_rsi_os", vars: { v: r }, dir: 1, w: 1 });
        else if (v >= 55) out.push({ tKey: "sig_rsi_bull", vars: { v: r }, dir: 1, w: 1 });
        else if (v <= 45) out.push({ tKey: "sig_rsi_bear", vars: { v: r }, dir: -1, w: 1 });
        else out.push({ tKey: "sig_rsi_flat", vars: { v: r }, dir: 0, w: 0 });
      }
    }

    if (shown.has("macd")) {
      const h = ind.macd.hist[i],
        hp = ind.macd.hist[i - 1];
      if (h != null && hp != null) {
        const eps = close * 0.0001;
        if (h > eps && h >= hp) out.push({ tKey: "sig_macd_bull", dir: 1, w: 1 });
        else if (h < -eps && h <= hp) out.push({ tKey: "sig_macd_bear", dir: -1, w: 1 });
        else if (h > eps && h < hp) out.push({ tKey: "sig_macd_fadeup", dir: 0, w: 0 });
        else if (h < -eps && h > hp) out.push({ tKey: "sig_macd_fadedown", dir: 0, w: 0 });
        else out.push({ tKey: "sig_macd_flat", dir: 0, w: 0 });
      }
    }

    if (shown.has("sr")) {
      const atr = ind.atr14[i] || close * 0.02;
      const levels = findLevels(s, VIS_START, i, atr * 0.8);
      let res = null,
        sup = null;
      for (const L of levels) {
        if (L.price > close && (!res || L.price < res.price)) res = L;
        if (L.price <= close && (!sup || L.price > sup.price)) sup = L;
      }
      const dRes = res ? res.price - close : Infinity;
      const dSup = sup ? close - sup.price : Infinity;
      const nearRes = dRes <= atr * 0.9;
      const nearSup = dSup <= atr * 0.9;
      if (nearRes && (!nearSup || dRes <= dSup))
        out.push({ tKey: "sig_sr_res", vars: { lvl: fmtPrice(res.price) }, dir: -1, w: 1 });
      else if (nearSup)
        out.push({ tKey: "sig_sr_sup", vars: { lvl: fmtPrice(sup.price) }, dir: 1, w: 1 });
      else out.push({ tKey: "sig_sr_none", dir: 0, w: 0 });
    }

    if (shown.has("vol")) {
      const v = s[i].volume,
        a = ind.volAvg10[i];
      if (a) {
        if (v > a * 1.25)
          out.push({
            tKey: "sig_vol_conf",
            vars: { colorKey: s[i].bull ? "w_greens" : "w_reds" },
            dir: s[i].bull ? 1 : -1,
            w: 1,
          });
        else if (v < a * 0.75) out.push({ tKey: "sig_vol_low", dir: 0, w: 0 });
        else out.push({ tKey: "sig_vol_norm", dir: 0, w: 0 });
      }
    }

    // price-action streak — always on, every level
    let n = 1;
    while (n < 6 && s[i - n] && s[i - n].bull === s[i].bull) n++;
    if (n >= 3)
      out.push({
        tKey: "sig_streak",
        vars: { n, colorKey: s[i].bull ? "w_greens" : "w_reds" },
        dir: s[i].bull ? 1 : -1,
        w: 1,
      });

    return out;
  }

  function consensusOf(signals) {
    return signals.reduce((acc, s) => acc + s.dir * s.w, 0);
  }

  /* ---------------- Analysis card ---------------- */
  function renderAnalysis() {
    if (!lastAnalysis) {
      dom.analysis.hidden = true;
      return;
    }
    const { round, signals, consensus, userDir, actualDir } = lastAnalysis;
    dom.analysis.hidden = false;
    dom.anTitle.textContent = t("analysis_title", { n: round });

    const cDir = Math.sign(consensus);
    let hKey, hClass;
    if (userDir === actualDir) {
      hKey =
        cDir === 0
          ? "an_correct_mixed"
          : cDir !== userDir
          ? "an_correct_against"
          : "an_correct_with";
      hClass = "good";
    } else if (cDir === 0) {
      hKey = "an_wrong_mixed";
      hClass = "neutral";
    } else if (cDir === actualDir) {
      hKey = "an_wrong_signals";
      hClass = "bad";
    } else {
      hKey = "an_wrong_luck";
      hClass = "neutral";
    }
    dom.anHeadline.textContent = t(hKey, {
      word: t(actualDir > 0 ? "word_up" : "word_down"),
    });
    dom.anHeadline.className = "an-headline " + hClass;

    const leadTxt =
      cDir > 0
        ? t("lead_up", { s: "+" + consensus })
        : cDir < 0
        ? t("lead_down", { s: String(consensus) })
        : t("lead_flat");
    dom.anLead.textContent = t("an_lead", { txt: leadTxt });

    dom.anList.innerHTML = "";
    for (const sig of signals) {
      const li = document.createElement("li");
      li.className = "an-row";

      const dir = document.createElement("span");
      dir.className = "an-dir " + (sig.dir > 0 ? "up" : sig.dir < 0 ? "down" : "flat");
      dir.textContent = sig.dir > 0 ? "▲" : sig.dir < 0 ? "▼" : "•";

      const vars = Object.assign({}, sig.vars);
      if (vars.colorKey) {
        vars.color = t(vars.colorKey);
        delete vars.colorKey;
      }
      const txt = document.createElement("span");
      txt.className = "an-text";
      txt.textContent = t(sig.tKey, vars);

      const verdict = document.createElement("span");
      if (sig.dir === 0) {
        verdict.className = "an-verdict flat";
        verdict.textContent = "—";
        verdict.title = t("an_flat");
      } else if (sig.dir === actualDir) {
        verdict.className = "an-verdict hit";
        verdict.textContent = "✓";
        verdict.title = t("an_hit");
      } else {
        verdict.className = "an-verdict miss";
        verdict.textContent = "✗";
        verdict.title = t("an_miss");
      }

      li.appendChild(dir);
      li.appendChild(txt);
      li.appendChild(verdict);
      dom.anList.appendChild(li);
    }
  }

  /* ---------------- Progress / score ---------------- */
  function renderProgress() {
    const ol = dom.progress;
    while (ol.firstChild) ol.removeChild(ol.firstChild);
    for (let i = 0; i < CONFIG.ROUNDS; i++) {
      const li = document.createElement("li");
      if (i < game.results.length) {
        li.classList.add(game.results[i] ? "is-correct" : "is-wrong");
      } else if (i === game.round && !game.finished) {
        li.classList.add("is-current");
      }
      ol.appendChild(li);
    }
  }

  function score() {
    return game.results.filter(Boolean).length;
  }

  function renderScore() {
    dom.score.innerHTML = `${t("score_label")} <strong>${score()}</strong> / ${CONFIG.ROUNDS}`;
  }

  function setControls(enabled) {
    dom.bull.disabled = !enabled;
    dom.bear.disabled = !enabled;
  }

  /* ---------------- Mode / level / indicator bars ---------------- */
  function renderModeBars() {
    const isPractice = game && game.mode === "practice";
    dom.tabDaily.setAttribute("aria-selected", String(!isPractice));
    dom.tabPractice.setAttribute("aria-selected", String(isPractice));
    dom.levelbar.hidden = !isPractice;
    $$("#levelbar button").forEach((b) => {
      b.classList.toggle("is-active", Number(b.dataset.level) === prefs.practiceLevel);
    });
    const act = activeIndSet();
    $$("#indbar .ind-chip").forEach((b) => {
      const k = b.dataset.ind;
      b.hidden = !act.has(k);
      b.setAttribute("aria-pressed", String(prefs.indOn[k] !== false));
    });
    dom.indbar.hidden = act.size === 0;
  }

  /* ---------------- Core loop ---------------- */
  function startDaily() {
    const today = new Date();
    const number = puzzleNumberFor(today);
    const saved = Store.get(KEYS.daily(number), null);
    const series = generateSeries("candle-daily-" + number);
    game = {
      mode: "daily",
      number,
      series,
      ind: computeIndicators(series),
      round: saved ? clampInt(saved.round, 0, CONFIG.ROUNDS) : 0,
      results:
        saved && Array.isArray(saved.results)
          ? saved.results.map(Boolean).slice(0, CONFIG.ROUNDS)
          : [],
      finished: saved ? !!saved.finished : false,
    };
    lastAnalysis = null;
    dom.modeWord.textContent = t("tab_daily");
    dom.number.textContent = "#" + number;
    dom.date.textContent = formatDate(today);
    refreshAll();
    if (game.finished) {
      setControls(false);
      openResult(false);
    }
  }

  function startPractice() {
    practiceCounter += 1;
    const seedStr = "candle-practice-" + practiceCounter + "-" + Math.floor(performance.now());
    const series = generateSeries(seedStr);
    game = {
      mode: "practice",
      number: practiceCounter,
      series,
      ind: computeIndicators(series),
      round: 0,
      results: [],
      finished: false,
    };
    lastAnalysis = null;
    dom.modeWord.textContent = t("tab_practice");
    dom.number.textContent = "#" + practiceCounter;
    dom.date.textContent = t("practice_sub");
    refreshAll();
    closeAllModals();
    announce(t("ann_practice"));
  }

  function refreshAll() {
    renderModeBars();
    renderCharts();
    renderProgress();
    renderScore();
    renderAnalysis();
    setControls(!game.finished);
    dom.feedback.textContent = "";
    dom.feedback.className = "feedback";
  }

  function call(predictBull) {
    if (busy || !game || game.finished) return;
    if (game.round >= CONFIG.ROUNDS) return;

    busy = true;
    setControls(false);

    // read the signals BEFORE the reveal — that's what the player saw
    const signals = computeSignals();
    const consensus = consensusOf(signals);

    const target = game.series[VIS_START + CONFIG.HISTORY + game.round];
    const correct = target.bull === predictBull;
    game.results.push(correct);
    game.round += 1;

    lastAnalysis = {
      round: game.round,
      signals,
      consensus,
      userDir: predictBull ? 1 : -1,
      actualDir: target.bull ? 1 : -1,
    };

    renderCharts();
    renderProgress();
    renderScore();
    renderAnalysis();

    // persist progress every round so a refresh can't reset (or replay) the daily
    if (game.mode === "daily") saveDaily();

    Sound.play(correct ? "good" : "bad");
    flashFeedback(correct, target.bull);

    window.setTimeout(() => {
      busy = false;
      if (game.round >= CONFIG.ROUNDS) {
        finishGame();
      } else {
        setControls(true);
        renderCharts(); // redraw with the new placeholder
        renderProgress();
      }
    }, 620);
  }

  function flashFeedback(correct, wasBull) {
    const word = t(wasBull ? "w_green" : "w_red");
    dom.feedback.textContent = t(correct ? "fb_correct" : "fb_wrong", { word });
    dom.feedback.className = "feedback " + (correct ? "good" : "bad");
    const btn = wasBull ? dom.bull : dom.bear;
    btn.classList.add(wasBull ? "flash-bull" : "flash-bear");
    window.setTimeout(() => btn.classList.remove("flash-bull", "flash-bear"), 520);
    announce(t(correct ? "ann_correct" : "ann_wrong"));
  }

  function finishGame() {
    game.finished = true;
    setControls(false);
    renderCharts();
    renderProgress();

    if (game.mode === "daily") {
      recordDailyResult();
      saveDaily();
    }
    const won = score() >= CONFIG.PASS;
    window.setTimeout(() => {
      Sound.play(won ? "win" : "bad");
      openResult(true);
    }, 450);
  }

  /* ---------------- Stats + persistence ---------------- */
  function recordDailyResult() {
    if (stats.lastNumber === game.number) return;
    const s = score();
    const pass = s >= CONFIG.PASS;

    stats.played += 1;
    stats.totalCorrect += s;
    stats.dist[s] = (stats.dist[s] || 0) + 1;
    if (s === CONFIG.ROUNDS) stats.perfect += 1;
    if (pass) stats.passes += 1;

    if (pass) {
      if (stats.lastNumber === game.number - 1) stats.currentStreak += 1;
      else stats.currentStreak = 1;
    } else {
      stats.currentStreak = 0;
    }
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
    stats.lastNumber = game.number;

    Store.set(KEYS.stats, stats);
  }

  function saveDaily() {
    Store.set(KEYS.daily(game.number), {
      round: game.round,
      results: game.results,
      finished: game.finished,
    });
  }

  /* ---------------- Result modal ---------------- */
  function openResult(announceIt) {
    const s = score();
    dom.resultHeadline.textContent = t("headline_" + s);
    dom.resultScore.textContent = `${s} / ${CONFIG.ROUNDS}`;
    dom.resultGrid.textContent = game.results.map((r) => (r ? "🟩" : "🟥")).join("");

    dom.resultMini.innerHTML = "";
    const minis =
      game.mode === "daily"
        ? [
            [t("mini_streak"), stats.currentStreak],
            [t("mini_max"), stats.maxStreak],
            [t("mini_win"), winRate()],
          ]
        : [[t("mini_mode"), t("mini_practice")]];
    for (const [label, val] of minis) {
      const div = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = String(val);
      div.appendChild(strong);
      div.appendChild(document.createTextNode(label));
      dom.resultMini.appendChild(div);
    }

    startCountdown();
    showModal(dom.result);
    if (announceIt) announce(`${s} / ${CONFIG.ROUNDS}`);
  }

  function winRate() {
    return stats.played ? Math.round((stats.passes / stats.played) * 100) : 0;
  }

  /* ---------------- Sharing ---------------- */
  function shareText() {
    const s = score();
    const grid = game.results.map((r) => (r ? "🟩" : "🟥")).join("");
    const label =
      game.mode === "daily"
        ? `CANDLE #${game.number}`
        : `CANDLE practice·L${prefs.practiceLevel}`;
    const url = shareUrl();
    return `${label}  ${s}/${CONFIG.ROUNDS}\n${grid}${url ? "\n" + url : ""}`;
  }
  function shareUrl() {
    if (location.protocol === "http:" || location.protocol === "https:") {
      return location.origin + location.pathname.replace(/index\.html$/, "");
    }
    return "";
  }

  async function doShare() {
    const text = shareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled — fall through to clipboard */
      }
    }
    const ok = await copyToClipboard(text);
    flashShareFeedback(ok);
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function flashShareFeedback(ok) {
    const btn = $("#btn-share");
    const original = btn.textContent;
    btn.textContent = t(ok ? "share_copied" : "share_failed");
    announce(btn.textContent);
    window.setTimeout(() => (btn.textContent = original), 1900);
  }

  /* ---------------- Countdown ---------------- */
  function startCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    const tick = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      let ms = next - now;
      if (ms < 0) ms = 0;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      const pad = (x) => String(x).padStart(2, "0");
      dom.countdown.textContent = `${pad(h)}:${pad(m)}:${pad(sec)}`;
      if (ms === 0 && game && game.mode === "daily" && puzzleNumberFor(now) !== game.number) {
        startDaily();
      }
    };
    tick();
    countdownTimer = window.setInterval(tick, 1000);
  }

  /* ---------------- Stats modal ---------------- */
  function renderStats() {
    $("#st-played").textContent = stats.played;
    $("#st-winrate").textContent = winRate();
    $("#st-streak").textContent = stats.currentStreak;
    $("#st-maxstreak").textContent = stats.maxStreak;

    const wrap = $("#dist");
    wrap.innerHTML = "";
    const maxCount = Math.max(1, ...stats.dist);
    const todayScore = game && game.mode === "daily" && game.finished ? score() : -1;
    for (let i = CONFIG.ROUNDS; i >= 0; i--) {
      const count = stats.dist[i] || 0;
      const row = document.createElement("div");
      row.className = "dist__row";
      const key = document.createElement("span");
      key.className = "dist__key";
      key.textContent = i;
      const bar = document.createElement("div");
      bar.className = "dist__bar " + (i === todayScore ? "is-best" : "is-other");
      bar.style.width = `${Math.round((count / maxCount) * 100)}%`;
      bar.textContent = count;
      row.appendChild(key);
      row.appendChild(bar);
      wrap.appendChild(row);
    }
  }

  /* ---------------- Modal helpers ---------------- */
  function showModal(dlg) {
    closeAllModals();
    if (typeof dlg.showModal === "function") {
      try {
        dlg.showModal();
        return;
      } catch {
        /* already open or unsupported */
      }
    }
    dlg.setAttribute("open", "");
  }
  function closeAllModals() {
    [dom.help, dom.stats, dom.result].forEach((d) => {
      if (d.open) {
        if (typeof d.close === "function") d.close();
        else d.removeAttribute("open");
      }
    });
  }

  /* ---------------- Preferences ---------------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", prefs.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", prefs.theme === "light" ? "#f4f6fb" : "#0b0f17");
  }
  function applySound() {
    const btn = $("#btn-sound");
    btn.setAttribute("aria-pressed", String(prefs.sound));
  }
  function applyLang() {
    document.documentElement.lang = prefs.lang;
    $("#btn-lang").textContent = prefs.lang.toUpperCase();
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    dom.helpBody.innerHTML = t("help_html");
    if (game) {
      dom.modeWord.textContent = t(game.mode === "daily" ? "tab_daily" : "tab_practice");
      dom.date.textContent = game.mode === "daily" ? formatDate(new Date()) : t("practice_sub");
      renderScore();
      renderAnalysis();
      if (dom.result.open) openResult(false);
    }
  }
  function savePrefs() {
    Store.set(KEYS.prefs, prefs);
  }

  /* ---------------- Event wiring ---------------- */
  function wire() {
    dom.bull.addEventListener("click", () => call(true));
    dom.bear.addEventListener("click", () => call(false));

    dom.tabDaily.addEventListener("click", () => {
      if (game && game.mode === "daily") return;
      startDaily();
    });
    dom.tabPractice.addEventListener("click", () => {
      if (game && game.mode === "practice" && !game.finished) return;
      startPractice();
    });

    dom.levelbar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-level]");
      if (!btn) return;
      const lv = clampInt(btn.dataset.level, 1, LEVELS.length);
      if (lv === prefs.practiceLevel && game && game.mode === "practice") return;
      prefs.practiceLevel = lv;
      savePrefs();
      startPractice();
    });

    dom.indbar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-ind]");
      if (!btn) return;
      const k = btn.dataset.ind;
      prefs.indOn[k] = !(prefs.indOn[k] !== false);
      savePrefs();
      renderModeBars();
      renderCharts();
    });

    $("#btn-help").addEventListener("click", () => showModal(dom.help));
    $("#btn-how-footer").addEventListener("click", () => showModal(dom.help));
    $("#btn-stats").addEventListener("click", () => {
      renderStats();
      showModal(dom.stats);
    });

    $("#btn-sound").addEventListener("click", () => {
      prefs.sound = !prefs.sound;
      applySound();
      savePrefs();
      if (prefs.sound) Sound.play("good");
    });
    $("#btn-theme").addEventListener("click", () => {
      prefs.theme = prefs.theme === "light" ? "dark" : "light";
      applyTheme();
      savePrefs();
    });
    $("#btn-lang").addEventListener("click", () => {
      prefs.lang = prefs.lang === "pl" ? "en" : "pl";
      savePrefs();
      applyLang();
    });

    $("#btn-share").addEventListener("click", doShare);
    $("#btn-practice").addEventListener("click", startPractice);

    document.addEventListener("keydown", (e) => {
      const open = dom.help.open || dom.stats.open || dom.result.open;
      if (open) return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "b") {
        e.preventDefault();
        call(true);
      } else if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        call(false);
      }
    });

    // responsive redraw — charts use real pixel-width viewBoxes
    if ("ResizeObserver" in window) {
      let raf = 0;
      const ro = new ResizeObserver(() => {
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          renderCharts();
        });
      });
      ro.observe(dom.chartWrap);
    } else {
      window.addEventListener("resize", () => renderCharts());
    }

    window.addEventListener("pagehide", () => {
      if (countdownTimer) window.clearInterval(countdownTimer);
    });
  }

  /* ---------------- Service worker ---------------- */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  /* ---------------- Boot ---------------- */
  function init() {
    applyTheme();
    applySound();
    wire();
    applyLang();
    startDaily();

    if (!prefs.seenHelp) {
      prefs.seenHelp = true;
      savePrefs();
      if (!game.finished) showModal(dom.help);
    }
    registerSW();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
