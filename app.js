/* ============================================================
   CANDLE — daily market-reading puzzle (v4)
   Pure client-side, no dependencies, no network, no paid services.

   v4 adds: Survival mode (3 lives, sliding chart window),
   Blitz timer, per-indicator read accuracy with lesson hints,
   post-game equity curve, calendar heatmap, local badges
   (also drawn on the share PNG) and progress export/import.
   ============================================================ */
"use strict";

(function () {
  const APP_VERSION = "v6";

  /* ---------------- Config ---------------- */
  const CONFIG = {
    WARMUP: 50,
    HISTORY: 24,
    ROUNDS: 6,
    PASS: 4,
    EPOCH: new Date(2026, 0, 1),
    SUR_LIVES: 3,
    SUR_MAX: 120,
    BLITZ_S: 10,
    BLITZ_S_HARD: 25,
  };
  const VISIBLE = CONFIG.HISTORY + CONFIG.ROUNDS;
  const GEN_TOTAL = CONFIG.WARMUP + VISIBLE;
  const SUR_TOTAL = CONFIG.WARMUP + CONFIG.HISTORY + CONFIG.SUR_MAX;
  const VIS_START = CONFIG.WARMUP;

  const ALL_INDS = ["ma", "vol", "rsi", "macd", "sr", "bb", "stoch", "fib"];
  const LEVELS = [
    { id: 1, inds: [] },
    { id: 2, inds: ["ma"] },
    { id: 3, inds: ["ma", "vol", "rsi"] },
    { id: 4, inds: ["ma", "vol", "rsi", "macd", "sr"] },
    { id: 5, inds: ["ma", "vol", "rsi", "macd", "sr", "bb", "stoch"] },
    { id: 6, inds: ["ma", "vol", "rsi", "macd", "sr", "bb", "stoch", "fib"] },
  ];
  // indicator -> index in the LESSONS bank (for the "weakest read" hint)
  const LESSON_FOR_KEY = { ma: 9, vol: 4, rsi: 6, macd: 10, sr: 7, bb: 15, stoch: 16, fib: 17 };

  // Academy missions — one tool at a time, finished with an exam
  const MISSIONS = [
    { id: "m1", inds: [], pass: 3, icon: "🕯️" },
    { id: "m2", inds: ["ma"], pass: 4, icon: "📈" },
    { id: "m3", inds: ["ma", "vol"], pass: 4, icon: "📊" },
    { id: "m4", inds: ["rsi"], pass: 4, icon: "🌡️" },
    { id: "m5", inds: ["macd"], pass: 4, icon: "🚂" },
    { id: "m6", inds: ["sr"], pass: 4, icon: "🧱" },
    { id: "m7", inds: ["bb"], pass: 4, icon: "🎈" },
    { id: "m8", inds: ["stoch"], pass: 4, icon: "🎢" },
    { id: "m9", inds: ["fib"], pass: 4, icon: "🌀" },
    { id: "m10", inds: ["ma", "vol", "rsi", "macd", "sr", "bb", "stoch", "fib"], pass: 5, icon: "🎓" },
  ];

  const KEYS = {
    stats: "candle.stats.v1",
    statsHard: "candle.stats.hard.v1",
    prefs: "candle.prefs.v1",
    survival: "candle.survival.v1",
    badges: "candle.badges.v1",
    academy: "candle.academy.v1",
    daily: (n, hard) => `candle.daily${hard ? ".hard" : ""}.v2.${n}`,
  };

  /* ---------------- i18n ---------------- */
  const STR = {
    en: {
      tab_daily: "Daily",
      tab_practice: "Practice",
      tab_survival: "Survival",
      lv_1: "Pure price",
      lv_2: "+ Averages",
      lv_3: "+ Momentum",
      lv_4: "Pro",
      lv_5: "Expert",
      lv_6: "Master",
      new_chart: "New chart",
      question_html:
        'Will the next candle close <strong class="up">green</strong> or <strong class="down">red</strong>?',
      bull_hint: "close up",
      bear_hint: "close down",
      score_label: "Score",
      fb_correct: "Correct — closed {word}.",
      fb_wrong: "Missed — closed {word}.",
      fb_tag_first: "HARD: tag every indicator first.",
      fb_timeout: "Time's up — counts as a miss!",
      w_green: "green (bull)",
      w_red: "red (bear)",
      w_greens: "green",
      w_reds: "red",
      word_up: "the upside (BULL)",
      word_down: "the downside (BEAR)",
      practice_sub: "Training — fresh chart, does not affect stats",
      sur_sub: "Survive as long as you can — 3 misses end the run",
      reads_title: "HARD: tag every indicator to unlock the call (keys: 1=▲ 2=• 3=▼)",
      other_daily_hard: "Today's HARD daily awaits → play it",
      other_daily_norm: "Today's normal daily awaits → play it",
      you_said: "You:",
      ind_name_ma: "Trend (MA)",
      ind_name_vol: "Volume",
      ind_name_rsi: "RSI",
      ind_name_macd: "MACD",
      ind_name_sr: "Support/Resist.",
      ind_name_bb: "Bollinger",
      ind_name_stoch: "Stochastic",
      ind_name_fib: "Fibonacci",
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
      an_timeout: "Time ran out — the market doesn't wait. A skipped call counts as a miss.",
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
      sig_bb_above:
        "Close above the upper Bollinger Band — stretched; snap-backs are common (strong trends can ride the band)",
      sig_bb_below: "Close below the lower Bollinger Band — stretched down; bounce odds grow",
      sig_bb_squeeze: "Bollinger squeeze — volatility is coiled, a breakout is brewing (direction unknown)",
      sig_bb_inside: "Price inside the Bollinger Bands — no volatility extreme",
      sig_stoch_ob: "Stochastic {k} — overbought zone (above 80)",
      sig_stoch_os: "Stochastic {k} — oversold zone (below 20)",
      sig_stoch_xup: "Stochastic %K crossed above %D — fresh bullish momentum",
      sig_stoch_xdown: "Stochastic %K crossed below %D — fresh bearish momentum",
      sig_stoch_flat: "Stochastic {k} — mid-range, no signal",
      sig_fib_sup: "Price testing the {r} Fibonacci retracement of the up-swing — a classic bounce spot",
      sig_fib_res: "Price testing the {r} Fibonacci retracement of the down-swing — a classic rejection spot",
      sig_fib_none: "No Fibonacci level in play",
      sig_streak:
        "{n} {color} candles in a row — momentum often carries on, but stretched runs love to snap back",
      headline_6: "Flawless read. 🏆",
      headline_5: "Sharp eye. 📈",
      headline_4: "You beat the market. ✅",
      headline_3: "So close. 📉",
      headline_2: "Rough session.",
      headline_1: "The market won today.",
      headline_0: "Brutal. Hit practice mode.",
      sur_over: "You lasted {n} rounds.",
      sur_new_record: "New record! 🏆",
      png_rounds: "hits · {r} rounds",
      sur_rounds_word: "rounds",
      res_title: "Round complete",
      res_share: "Share text",
      res_share_img: "📸 Share image",
      res_practice: "Practice mode",
      res_again: "Run again",
      res_next: "Next daily in",
      mini_streak: "Streak",
      mini_max: "Max",
      mini_win: "Win %",
      mini_reads: "Reads %",
      mini_mode: "Mode",
      mini_practice: "Practice",
      mini_rounds: "Rounds",
      mini_hits: "Hits",
      mini_best: "Best",
      lesson_title: "📚 Lesson of the day",
      stats_title: "Statistics",
      st_normal: "Normal",
      st_played: "played",
      st_beat: "% beat",
      st_streak: "streak",
      st_max: "max streak",
      st_reads: "Lifetime read accuracy: {pct}%",
      acc_title: "Read accuracy per indicator",
      acc_weak_tip: "Weakest read: {name} — recommended lesson:",
      dist_title: "Score distribution",
      heat_title: "Last 12 weeks",
      badges_title: "Badges",
      sur_best_line: "Survival records — normal: {a} · HARD: {b} · ⚡: {c} · ⚡HARD: {d}",
      btn_export: "⬇ Export progress",
      btn_import: "⬆ Import",
      exp_done: "Backup downloaded!",
      imp_confirm: "Import will overwrite your current progress. Continue?",
      imp_fail: "Invalid backup file",
      new_badge: "🏆 New badge:",
      b_first_win_n: "First win",
      b_first_win_d: "Beat a daily market (4+/6)",
      b_perfect_n: "Flawless",
      b_perfect_d: "Score 6/6 in a daily",
      b_streak7_n: "Week on fire",
      b_streak7_d: "Reach a 7-day streak",
      b_streak30_n: "Iron month",
      b_streak30_d: "Reach a 30-day streak",
      b_hard_n: "Hardcore",
      b_hard_d: "Win a HARD daily",
      b_reads90_n: "Market reader",
      b_reads90_d: "90%+ read accuracy in a HARD daily",
      b_survivor_n: "Marathoner",
      b_survivor_d: "Score 20+ hits in Survival",
      b_scholar_n: "Scholar",
      b_scholar_d: "Finish practice on all 6 levels",
      b_blitz_n: "Reflex",
      b_blitz_d: "Win a ⚡BLITZ practice round (4+/6)",
      eq_stake: "Stake 100 per round:",
      eq_you: "You",
      eq_hold: "Buy & hold",
      tab_academy: "Academy",
      academy_title: "Academy — one tool at a time",
      academy_progress: "{a}/{b} missions",
      mis_back: "← missions",
      mis_goal: "Goal: {n}+/6",
      mis_passed: "Mission passed! ✅",
      mis_failed: "Not this time — read the brief and try again.",
      mis_next: "Next mission →",
      b_grad_n: "Graduate",
      b_grad_d: "Complete all Academy missions",
      m1_t: "Candles 101",
      m1_b: "No indicators — just bodies and wicks. A big body = conviction, a long wick = rejection of that price. Three same-colour candles in a row carry momentum.",
      m2_t: "Moving averages",
      m2_b: "EMA9 (blue) above SMA20 (orange) with price above both = uptrend — and continuation is more common than reversal. Trade with the slope, not against it.",
      m3_t: "Volume",
      m3_b: "Volume is the lie detector: impulses on tall bars deserve trust, moves on thin volume fade easily. Watch bars vs the dotted average line.",
      m4_t: "RSI",
      m4_b: "Above 70 = stretched, below 30 = washed out, 55–70 = healthy bullish momentum. Think in zones, not single values.",
      m5_t: "MACD",
      m5_b: "Watch the histogram: growing = the move accelerates, shrinking = it runs out of fuel — often before price turns.",
      m6_t: "Support & resistance",
      m6_b: "Price near a dashed level usually reacts. Bounces are more common than breaks — but a clean break tends to keep going.",
      m7_t: "Bollinger Bands",
      m7_b: "A close outside the bands is a stretched rubber band — snap-backs are common. A tight squeeze means a breakout is loading.",
      m8_t: "Stochastic",
      m8_b: "Extremes above 80 / below 20 plus %K crossing %D. It shines in ranging markets — in strong trends it pins to the extreme.",
      m9_t: "Fibonacci",
      m9_b: "Retracements of the last big swing: 0.382 / 0.5 / 0.618 are classic floors and ceilings where reactions happen.",
      m10_t: "Final exam",
      m10_b: "Full toolkit, no excuses. Prove you can read the market: 5 out of 6.",
      real_btn: "Real market",
      real_loading: "Fetching a real chart…",
      real_fail: "Live data unavailable — using the simulator.",
      real_reveal: "🌍 That was {sym} · {from} → {to}",
      practice_sub_real: "Real, anonymized market history — revealed after the round",
      help_title: "How to play",
      footer_note:
        "Skill, not luck — but the market always gets the last word. Scores stay on your device. Not financial advice.",
      footer_how: "How it works",
      ann_correct: "Correct.",
      ann_wrong: "Wrong.",
      ann_practice: "Practice round started.",
      ann_survival: "Survival run started.",
      share_copied: "Copied to clipboard!",
      share_failed: "Copy failed — select & copy",
      img_saved: "PNG saved — share it anywhere!",
      img_failed: "Could not create the image",
      help_html: `
        <p>Each day brings <strong>one chart</strong> — the same for everyone. Read it, then call whether the next candle closes <span class="up">green</span> (BULL) or <span class="down">red</span> (BEAR). Six calls per day; score <strong>4/6 or better</strong> to beat the market and keep your streak.</p>
        <h3>Your toolkit</h3>
        <ul>
          <li><strong>MA.</strong> <span class="kbd">SMA20</span> (orange) = slow trend, <span class="kbd">EMA9</span> (blue) reacts faster. Fast above slow with price above both = uptrend.</li>
          <li><strong>RSI(14).</strong> Above 70 = overbought, below 30 = oversold, ~50 = neutral.</li>
          <li><strong>MACD(12,26,9).</strong> Histogram above zero and growing = bulls accelerating; shrinking = move losing fuel.</li>
          <li><strong>S/R.</strong> Dashed lines where price turned before. Approaches often bounce; clean breaks often run.</li>
          <li><strong>Volume.</strong> Tall bars = conviction. A push on weak volume is easy to distrust.</li>
          <li><strong>Bollinger(20,2).</strong> Price outside the bands = stretched; a tight squeeze = breakout brewing.</li>
          <li><strong>Stochastic(14,3,3).</strong> Above 80 / below 20 = extremes; %K crossing %D = fresh momentum.</li>
          <li><strong>Fibonacci.</strong> Retracements of the last big swing (0.382/0.5/0.618…) — classic reaction spots.</li>
        </ul>
        <p><strong>HARD mode</strong> 🔥 — tag each visible indicator yourself (▲/•/▼) before every call. The game grades your reads. Separate daily streak.</p>
        <p><strong>Survival</strong> 🏃 — endless rounds, 3 misses end the run. <strong>⚡BLITZ</strong> — a ticking clock on every decision (practice &amp; survival).</p>
        <p><strong>Practice</strong> is unlimited, has levels 1–6 and a fresh random chart every time (🔄).</p>
        <p class="muted">Keyboard: <span class="kbd">↑</span>/<span class="kbd">B</span> = bull, <span class="kbd">↓</span>/<span class="kbd">S</span> = bear. Indicators give probabilities, not promises — that's the whole lesson. This is a game, not financial advice.</p>`,
    },
    pl: {
      tab_daily: "Dzienna",
      tab_practice: "Trening",
      tab_survival: "Survival",
      lv_1: "Czysta cena",
      lv_2: "+ Średnie",
      lv_3: "+ Momentum",
      lv_4: "Pro",
      lv_5: "Ekspert",
      lv_6: "Mistrz",
      new_chart: "Nowy wykres",
      question_html:
        'Czy następna świeca zamknie się <strong class="up">na zielono</strong> czy <strong class="down">na czerwono</strong>?',
      bull_hint: "zamknięcie wyżej",
      bear_hint: "zamknięcie niżej",
      score_label: "Wynik",
      fb_correct: "Trafione — zamknięcie {word}.",
      fb_wrong: "Pudło — zamknięcie {word}.",
      fb_tag_first: "HARD: najpierw oznacz wszystkie wskaźniki.",
      fb_timeout: "Czas minął — liczy się jak pudło!",
      w_green: "na zielono (byk)",
      w_red: "na czerwono (niedźwiedź)",
      w_greens: "zielonych",
      w_reds: "czerwonych",
      word_up: "wzrostów (BULL)",
      word_down: "spadków (BEAR)",
      practice_sub: "Trening — świeży wykres, nie wpływa na statystyki",
      sur_sub: "Przetrwaj jak najdłużej — 3 pomyłki kończą bieg",
      reads_title: "HARD: oznacz każdy wskaźnik, aby odblokować typowanie (klawisze: 1=▲ 2=• 3=▼)",
      other_daily_hard: "Dzisiejsza dzienna HARD czeka → zagraj",
      other_daily_norm: "Dzisiejsza zwykła dzienna czeka → zagraj",
      you_said: "Ty:",
      ind_name_ma: "Trend (MA)",
      ind_name_vol: "Wolumen",
      ind_name_rsi: "RSI",
      ind_name_macd: "MACD",
      ind_name_sr: "Wsparcie/Opór",
      ind_name_bb: "Bollinger",
      ind_name_stoch: "Stochastic",
      ind_name_fib: "Fibonacci",
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
      an_timeout: "Czas się skończył — rynek nie czeka. Brak decyzji liczy się jak pudło.",
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
      sig_bb_above:
        "Zamknięcie nad górną wstęgą Bollingera — rozciągnięcie; częste powroty do średniej (silny trend potrafi jechać po wstędze)",
      sig_bb_below: "Zamknięcie pod dolną wstęgą Bollingera — rozciągnięcie w dół; rośnie szansa odbicia",
      sig_bb_squeeze: "Ściśnięcie wstęg Bollingera — zmienność zwinięta, szykuje się wybicie (kierunek nieznany)",
      sig_bb_inside: "Cena wewnątrz wstęg Bollingera — bez ekstremum zmienności",
      sig_stoch_ob: "Stochastic {k} — strefa wykupienia (powyżej 80)",
      sig_stoch_os: "Stochastic {k} — strefa wyprzedania (poniżej 20)",
      sig_stoch_xup: "Stochastic: %K przecięło %D od dołu — świeże bycze momentum",
      sig_stoch_xdown: "Stochastic: %K przecięło %D od góry — świeże niedźwiedzie momentum",
      sig_stoch_flat: "Stochastic {k} — środek zakresu, bez sygnału",
      sig_fib_sup: "Cena testuje zniesienie Fibonacciego {r} fali wzrostowej — klasyczne miejsce odbicia",
      sig_fib_res: "Cena testuje zniesienie Fibonacciego {r} fali spadkowej — klasyczne miejsce odrzucenia",
      sig_fib_none: "Żaden poziom Fibonacciego nie jest w grze",
      sig_streak:
        "{n} {color} świec z rzędu — momentum często niesie dalej, ale rozciągnięte serie lubią się cofać",
      headline_6: "Bezbłędny odczyt. 🏆",
      headline_5: "Sokole oko. 📈",
      headline_4: "Pokonujesz rynek. ✅",
      headline_3: "O włos. 📉",
      headline_2: "Ciężka sesja.",
      headline_1: "Dziś wygrał rynek.",
      headline_0: "Brutalnie. Wskocz do treningu.",
      sur_over: "Przetrwałeś {n} rund.",
      sur_new_record: "Nowy rekord! 🏆",
      png_rounds: "trafień · {r} rund",
      sur_rounds_word: "rund",
      res_title: "Runda zakończona",
      res_share: "Udostępnij tekst",
      res_share_img: "📸 Udostępnij obrazek",
      res_practice: "Tryb treningowy",
      res_again: "Jeszcze raz",
      res_next: "Nowa dzienna za",
      mini_streak: "Seria",
      mini_max: "Maks",
      mini_win: "% wygranych",
      mini_reads: "% odczytów",
      mini_mode: "Tryb",
      mini_practice: "Trening",
      mini_rounds: "Rundy",
      mini_hits: "Trafienia",
      mini_best: "Rekord",
      lesson_title: "📚 Lekcja dnia",
      stats_title: "Statystyki",
      st_normal: "Normalny",
      st_played: "rozegrane",
      st_beat: "% wygranych",
      st_streak: "seria",
      st_max: "maks. seria",
      st_reads: "Trafność odczytów (łącznie): {pct}%",
      acc_title: "Celność odczytów per wskaźnik",
      acc_weak_tip: "Najsłabszy odczyt: {name} — polecana lekcja:",
      dist_title: "Rozkład wyników",
      heat_title: "Ostatnie 12 tygodni",
      badges_title: "Odznaki",
      sur_best_line: "Rekordy Survival — zwykły: {a} · HARD: {b} · ⚡: {c} · ⚡HARD: {d}",
      btn_export: "⬇ Eksport postępów",
      btn_import: "⬆ Import",
      exp_done: "Kopia pobrana!",
      imp_confirm: "Import nadpisze obecne postępy. Kontynuować?",
      imp_fail: "Nieprawidłowy plik kopii",
      new_badge: "🏆 Nowa odznaka:",
      b_first_win_n: "Pierwsza wygrana",
      b_first_win_d: "Pokonaj dzienny rynek (4+/6)",
      b_perfect_n: "Bezbłędnie",
      b_perfect_d: "Wynik 6/6 w dziennej",
      b_streak7_n: "Tydzień z rynkiem",
      b_streak7_d: "Osiągnij serię 7 dni",
      b_streak30_n: "Żelazny miesiąc",
      b_streak30_d: "Osiągnij serię 30 dni",
      b_hard_n: "Twardziel",
      b_hard_d: "Wygraj dzienną HARD",
      b_reads90_n: "Czytasz rynek",
      b_reads90_d: "90%+ odczytów w dziennej HARD",
      b_survivor_n: "Maratończyk",
      b_survivor_d: "Zdobądź 20+ trafień w Survival",
      b_scholar_n: "Akademik",
      b_scholar_d: "Ukończ trening na wszystkich 6 poziomach",
      b_blitz_n: "Refleks",
      b_blitz_d: "Wygraj trening ⚡BLITZ (4+/6)",
      eq_stake: "Stawka 100 na rundę:",
      eq_you: "Ty",
      eq_hold: "Kup i trzymaj",
      tab_academy: "Akademia",
      academy_title: "Akademia — jedno narzędzie na raz",
      academy_progress: "{a}/{b} misji",
      mis_back: "← misje",
      mis_goal: "Cel: {n}+/6",
      mis_passed: "Misja zaliczona! ✅",
      mis_failed: "Nie tym razem — przeczytaj brief i spróbuj ponownie.",
      mis_next: "Następna misja →",
      b_grad_n: "Absolwent",
      b_grad_d: "Ukończ wszystkie misje Akademii",
      m1_t: "Świece 101",
      m1_b: "Bez wskaźników — tylko korpusy i knoty. Duży korpus = przekonanie, długi knot = odrzucenie ceny. Trzy świece tego samego koloru z rzędu niosą momentum.",
      m2_t: "Średnie kroczące",
      m2_b: "EMA9 (niebieska) nad SMA20 (pomarańczową) i cena nad obiema = trend wzrostowy — a kontynuacja jest częstsza niż odwrócenie. Graj z nachyleniem, nie pod prąd.",
      m3_t: "Wolumen",
      m3_b: "Wolumen to wykrywacz kłamstw: impulsy na wysokich słupkach zasługują na zaufanie, ruchy na cienkim wolumenie łatwo gasną. Porównuj słupki z kropkowaną średnią.",
      m4_t: "RSI",
      m4_b: "Powyżej 70 = rozciągnięty, poniżej 30 = wyprzedany, 55–70 = zdrowe bycze momentum. Myśl strefami, nie pojedynczymi wartościami.",
      m5_t: "MACD",
      m5_b: "Patrz na histogram: rośnie = ruch przyspiesza, maleje = kończy mu się paliwo — często zanim zawróci cena.",
      m6_t: "Wsparcia i opory",
      m6_b: "Cena przy przerywanym poziomie zwykle reaguje. Odbicia są częstsze niż wybicia — ale czyste wybicie zwykle kontynuuje ruch.",
      m7_t: "Wstęgi Bollingera",
      m7_b: "Zamknięcie poza wstęgą to naciągnięta guma — powroty są częste. Mocne ściśnięcie wstęg = ładuje się wybicie.",
      m8_t: "Stochastic",
      m8_b: "Ekstrema powyżej 80 / poniżej 20 plus przecięcia %K z %D. Błyszczy w konsolidacji — w silnym trendzie wisi przy ekstremum.",
      m9_t: "Fibonacci",
      m9_b: "Zniesienia ostatniej dużej fali: 0.382 / 0.5 / 0.618 to klasyczne podłogi i sufity, przy których rynek reaguje.",
      m10_t: "Egzamin maklerski",
      m10_b: "Pełny zestaw narzędzi, zero wymówek. Udowodnij, że czytasz rynek: 5 z 6.",
      real_btn: "Prawdziwy rynek",
      real_loading: "Pobieram prawdziwy wykres…",
      real_fail: "Dane na żywo niedostępne — używam symulatora.",
      real_reveal: "🌍 To był {sym} · {from} → {to}",
      practice_sub_real: "Prawdziwa, anonimowa historia rynku — odkryje się po rundzie",
      help_title: "Jak grać",
      footer_note:
        "Umiejętności, nie szczęście — ale ostatnie słowo zawsze należy do rynku. Wyniki zostają na Twoim urządzeniu. To nie jest porada inwestycyjna.",
      footer_how: "Jak to działa",
      ann_correct: "Trafione.",
      ann_wrong: "Pudło.",
      ann_practice: "Runda treningowa rozpoczęta.",
      ann_survival: "Bieg Survival rozpoczęty.",
      share_copied: "Skopiowano do schowka!",
      share_failed: "Kopiowanie nie wyszło — zaznacz i skopiuj",
      img_saved: "PNG zapisany — udostępnij gdzie chcesz!",
      img_failed: "Nie udało się stworzyć obrazka",
      help_html: `
        <p>Każdego dnia dostajesz <strong>jeden wykres</strong> — ten sam dla wszystkich. Odczytaj go i oceń, czy następna świeca zamknie się <span class="up">na zielono</span> (BULL) czy <span class="down">na czerwono</span> (BEAR). Sześć typów dziennie; wynik <strong>4/6+</strong> pokonuje rynek i podtrzymuje serię.</p>
        <h3>Twój zestaw narzędzi</h3>
        <ul>
          <li><strong>MA.</strong> <span class="kbd">SMA20</span> (pomarańczowa) = wolny trend, <span class="kbd">EMA9</span> (niebieska) reaguje szybciej. Szybka nad wolną i cena nad obiema = trend wzrostowy.</li>
          <li><strong>RSI(14).</strong> Powyżej 70 = wykupienie, poniżej 30 = wyprzedanie, ~50 = neutralnie.</li>
          <li><strong>MACD(12,26,9).</strong> Histogram nad zerem i rosnący = byki przyspieszają; malejący = ruch traci paliwo.</li>
          <li><strong>S/R.</strong> Przerywane linie tam, gdzie cena już zawracała. Podejścia często się odbijają, czyste wybicia kontynuują.</li>
          <li><strong>Wolumen.</strong> Wysokie słupki = przekonanie. Ruch na słabym wolumenie łatwo podważyć.</li>
          <li><strong>Bollinger(20,2).</strong> Cena poza wstęgami = rozciągnięcie; mocne ściśnięcie = szykuje się wybicie.</li>
          <li><strong>Stochastic(14,3,3).</strong> Powyżej 80 / poniżej 20 = ekstrema; przecięcie %K i %D = świeże momentum.</li>
          <li><strong>Fibonacci.</strong> Zniesienia ostatniej dużej fali (0.382/0.5/0.618…) — klasyczne miejsca reakcji.</li>
        </ul>
        <p><strong>Tryb HARD</strong> 🔥 — oznaczasz odczyt każdego wskaźnika (▲/•/▼) przed typem. Gra ocenia Twoje odczyty. Osobna dzienna seria.</p>
        <p><strong>Survival</strong> 🏃 — rundy bez końca, 3 pomyłki kończą bieg. <strong>⚡BLITZ</strong> — tykający zegar przy każdej decyzji (trening i survival).</p>
        <p><strong>Trening</strong> jest nielimitowany, ma poziomy 1–6 i świeży, losowy wykres za każdym razem (🔄).</p>
        <p class="muted">Klawiatura: <span class="kbd">↑</span>/<span class="kbd">B</span> = bull, <span class="kbd">↓</span>/<span class="kbd">S</span> = bear. Wskaźniki dają prawdopodobieństwa, nie obietnice — i to jest cała lekcja. To gra, nie porada inwestycyjna.</p>`,
    },
  };

  /* ---------------- Lessons of the day ---------------- */
  const LESSONS = {
    en: [
      ["Doji", "A candle with a tiny body means buyers and sellers fought to a draw. After a strong trend, a doji is often the first hint that the move is running out of conviction."],
      ["Engulfing pattern", "When a candle's body completely swallows the previous one in the opposite colour, sentiment may be flipping. The bigger the engulfing body and volume, the stronger the message."],
      ["Wicks tell stories", "A long lower wick means sellers pushed price down and got rejected. The close matters more than the journey — wicks show who lost the battle inside the candle."],
      ["The trend is your friend", "Most failed calls come from fighting the trend. Statistically, continuation is more common than reversal — betting on a turn needs stronger evidence than betting on more of the same."],
      ["Volume confirms", "A breakout on high volume has conviction behind it; the same breakout on thin volume is suspect. Watch what volume does at key levels — it's the market's lie detector."],
      ["Divergence", "When price makes a new high but RSI doesn't, momentum is quietly leaving the move. Divergences don't time the turn — they warn that fuel is running low."],
      ["Overbought ≠ sell", "RSI above 70 means stretched, not doomed. In strong trends RSI can stay overbought for a long time. Extremes are warnings, not triggers."],
      ["Role reversal", "Broken resistance often becomes support, and broken support becomes resistance. The market remembers prices where many people changed their minds."],
      ["False breakouts", "Price pokes above resistance, sucks in buyers, then collapses back — a classic trap. Wait for the close beyond the level, not just the wick."],
      ["Averages lag", "Moving-average crossovers confirm trends, they don't predict them. By the time the golden cross prints, part of the move is gone. They're filters, not crystal balls."],
      ["MACD anatomy", "MACD histogram measures the gap between momentum and its own average — momentum of momentum. A shrinking histogram often turns before price does."],
      ["Two market modes", "Markets alternate between trending and ranging. Momentum tools shine in trends; oscillators shine in ranges. The most expensive mistake is using the right tool in the wrong regime."],
      ["Position sizing", "Pros don't win because they predict better — they lose less when wrong. Risking a fixed small % per trade survives losing streaks that wipe out over-leveraged accounts."],
      ["Priced in", "Markets move on surprises, not news. If everyone expects good news, it's already in the price — that's why prices can fall on 'good' headlines."],
      ["Round numbers", "Levels like 100 or 50 000 act as psychological magnets and barriers. Stop-losses and orders cluster there, which is exactly why price reacts around them."],
      ["Bollinger squeeze", "When the bands pinch tight, volatility is compressed like a spring. The breakout direction is unknowable — but that a breakout is coming is the highest-probability bet on the chart."],
      ["Stochastic context", "Stochastic works best in ranges: buy oversold, sell overbought. In a strong trend it stays pinned at the extreme — context first, oscillator second."],
      ["Confluence", "One indicator is an opinion; three agreeing is a setup. A Fibonacci level sitting on old support with RSI oversold is stronger than any of them alone."],
      ["Gaps", "Stocks gap because news lands while markets are closed. Many gaps eventually get 'filled' — price returns to the gap area — but 'eventually' can take years. Crypto, trading 24/7, barely gaps at all."],
      ["Survivorship bias", "You hear from the trader who turned $1k into $1M, never from the thousand who blew up trying the same strategy. Judge strategies by all outcomes, not the winners' stories."],
      ["Think in bets", "A good decision can lose and a bad decision can win — once. Judge your process over many rounds, not single results. That's the difference between trading and gambling."],
      ["Keep a journal", "Writing down why you made each call exposes patterns your memory hides. Most traders discover they have one repeating mistake — you can't fix what you don't measure."],
      ["FOMO is expensive", "Chasing a move that already happened is buying other people's profits. If you missed it, you missed it — the market prints new opportunities every day."],
      ["Revenge trading", "Doubling down to 'win it back' after a loss is how small losses become big ones. The market doesn't know you're angry. Step away; the chart will still be there tomorrow."],
    ],
    pl: [
      ["Doji", "Świeca z maleńkim korpusem oznacza remis kupujących i sprzedających. Po silnym trendzie doji bywa pierwszą oznaką, że ruchowi kończy się przekonanie."],
      ["Formacja objęcia", "Gdy korpus świecy całkowicie pochłania poprzednią w przeciwnym kolorze, sentyment może się odwracać. Im większy korpus i wolumen objęcia, tym mocniejszy sygnał."],
      ["Knoty opowiadają historie", "Długi dolny knot znaczy, że podaż zepchnęła cenę w dół i została odrzucona. Zamknięcie znaczy więcej niż droga — knot pokazuje, kto przegrał bitwę wewnątrz świecy."],
      ["Trend jest Twoim przyjacielem", "Najwięcej pudeł bierze się z walki z trendem. Statystycznie kontynuacja jest częstsza niż odwrócenie — typ na zwrot wymaga mocniejszych dowodów niż typ na 'więcej tego samego'."],
      ["Wolumen potwierdza", "Wybicie na wysokim wolumenie ma za sobą przekonanie; to samo wybicie na cienkim wolumenie jest podejrzane. Obserwuj wolumen przy kluczowych poziomach — to wykrywacz kłamstw rynku."],
      ["Dywergencja", "Gdy cena robi nowy szczyt, a RSI już nie — momentum po cichu opuszcza ruch. Dywergencje nie wyznaczają momentu zwrotu — ostrzegają, że kończy się paliwo."],
      ["Wykupienie ≠ sprzedawaj", "RSI powyżej 70 znaczy 'rozciągnięte', nie 'skazane'. W silnym trendzie RSI potrafi długo zostać wykupione. Ekstrema to ostrzeżenia, nie spusty."],
      ["Zamiana ról", "Przebity opór często staje się wsparciem, a przebite wsparcie — oporem. Rynek pamięta ceny, przy których wielu ludzi zmieniło zdanie."],
      ["Fałszywe wybicia", "Cena wystaje ponad opór, wciąga kupujących i zapada się z powrotem — klasyczna pułapka. Czekaj na zamknięcie ponad poziomem, nie na sam knot."],
      ["Średnie się spóźniają", "Przecięcia średnich potwierdzają trendy, nie przewidują ich. Zanim wydrukuje się złoty krzyż, część ruchu już minęła. To filtry, nie szklane kule."],
      ["Anatomia MACD", "Histogram MACD mierzy odstęp między momentum a jego własną średnią — momentum momentum. Malejący histogram często zawraca wcześniej niż cena."],
      ["Dwa tryby rynku", "Rynki na zmianę trendują i chodzą bokiem. Narzędzia momentum błyszczą w trendach; oscylatory w konsolidacjach. Najdroższy błąd to dobre narzędzie w złym reżimie."],
      ["Wielkość pozycji", "Zawodowcy nie wygrywają, bo lepiej przewidują — oni mniej tracą, gdy się mylą. Ryzykowanie stałego małego % na transakcję pozwala przeżyć serie strat, które zmiatają przelewarowane konta."],
      ["W cenach", "Rynki ruszają się na zaskoczeniach, nie na newsach. Jeśli wszyscy oczekują dobrych wieści, są już w cenie — dlatego kursy potrafią spadać na 'dobrych' nagłówkach."],
      ["Okrągłe liczby", "Poziomy jak 100 czy 50 000 działają jak psychologiczne magnesy i bariery. Grupują się tam zlecenia i stop-lossy — właśnie dlatego cena wokół nich reaguje."],
      ["Ściśnięcie Bollingera", "Gdy wstęgi się zwężają, zmienność jest ściśnięta jak sprężyna. Kierunku wybicia nie da się przewidzieć — ale to, że wybicie nadchodzi, to najpewniejszy zakład na wykresie."],
      ["Stochastic w kontekście", "Stochastic najlepiej działa w konsolidacji: kupuj wyprzedanie, sprzedawaj wykupienie. W silnym trendzie wisi przyklejony do ekstremum — najpierw kontekst, potem oscylator."],
      ["Konfluencja", "Jeden wskaźnik to opinia; trzy zgodne to setup. Poziom Fibonacciego leżący na starym wsparciu przy wyprzedanym RSI znaczy więcej niż każdy z nich osobno."],
      ["Luki", "Akcje robią luki, bo newsy spadają przy zamkniętym rynku. Wiele luk się 'domyka' — cena wraca w ich obszar — ale 'w końcu' potrafi trwać latami. Krypto, handlowane 24/7, prawie nie ma luk."],
      ["Błąd przeżywalności", "Słyszysz o traderze, który zamienił 1k$ w 1M$, nigdy o tysiącu, którzy wyzerowali konta tą samą strategią. Oceniaj strategie po wszystkich wynikach, nie po opowieściach zwycięzców."],
      ["Myśl zakładami", "Dobra decyzja może przegrać, a zła wygrać — raz. Oceniaj swój proces na wielu rundach, nie na pojedynczych wynikach. To różnica między tradingiem a hazardem."],
      ["Prowadź dziennik", "Zapisywanie, dlaczego podjąłeś każdą decyzję, obnaża schematy, które pamięć ukrywa. Większość traderów odkrywa, że ma jeden powtarzalny błąd — nie naprawisz tego, czego nie mierzysz."],
      ["FOMO kosztuje", "Gonienie ruchu, który już się wydarzył, to kupowanie cudzych zysków. Jak uciekł, to uciekł — rynek drukuje nowe okazje codziennie."],
      ["Trading z zemsty", "Podwajanie stawki, żeby 'odrobić' po stracie, to przepis na zamianę małych strat w duże. Rynek nie wie, że jesteś zły. Odejdź od ekranu; wykres będzie tu jutro."],
    ],
  };

  /* ---------------- Badges ---------------- */
  const BADGES = [
    { id: "first_win", icon: "✅" },
    { id: "perfect", icon: "🎯" },
    { id: "streak7", icon: "🔥" },
    { id: "streak30", icon: "🌋" },
    { id: "hard", icon: "🦾" },
    { id: "reads90", icon: "🧠" },
    { id: "survivor", icon: "🏃" },
    { id: "scholar", icon: "🎓" },
    { id: "blitz", icon: "⚡" },
    { id: "grad", icon: "🎖️" },
  ];

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

  /* ---------------- Market model ---------------- */
  function generateSeries(seedStr, total) {
    const N = total || GEN_TOTAL;
    const rand = makeRng(seedStr);
    const candles = [];
    const base = 80 + rand() * 120;
    let price = base;
    const drift = (rand() - 0.5) * 0.0016;
    const vol = 0.012 + rand() * 0.022;
    const phi = rand() * 0.9 - 0.3;
    const reversion = 0.01 + rand() * 0.02;

    let prevRet = 0;
    for (let i = 0; i < N; i++) {
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
      const volume = Math.round(40 + 1500 * Math.min(0.06, Math.abs(ret)) + 35 * rand());

      candles.push({ open, close, high, low: Math.max(0.5, low), bull: close >= open, volume });
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
  function bollingerArr(closes, n, mult) {
    const up = new Array(closes.length).fill(null);
    const lo = new Array(closes.length).fill(null);
    let sum = 0,
      sumsq = 0;
    for (let i = 0; i < closes.length; i++) {
      sum += closes[i];
      sumsq += closes[i] * closes[i];
      if (i >= n) {
        sum -= closes[i - n];
        sumsq -= closes[i - n] * closes[i - n];
      }
      if (i >= n - 1) {
        const mean = sum / n;
        const sd = Math.sqrt(Math.max(0, sumsq / n - mean * mean));
        up[i] = mean + mult * sd;
        lo[i] = mean - mult * sd;
      }
    }
    return { up, lo };
  }
  function stochArr(series, n, smooth, dN) {
    const raw = new Array(series.length).fill(null);
    for (let i = n - 1; i < series.length; i++) {
      let hi = -Infinity,
        lo = Infinity;
      for (let j = i - n + 1; j <= i; j++) {
        if (series[j].high > hi) hi = series[j].high;
        if (series[j].low < lo) lo = series[j].low;
      }
      raw[i] = hi === lo ? 50 : (100 * (series[i].close - lo)) / (hi - lo);
    }
    const smaOf = (arr, m) => {
      const out = new Array(arr.length).fill(null);
      const q = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] == null) continue;
        q.push(arr[i]);
        if (q.length > m) q.shift();
        if (q.length === m) out[i] = q.reduce((a, b) => a + b, 0) / m;
      }
      return out;
    };
    const k = smaOf(raw, smooth);
    const d = smaOf(k, dN);
    return { k, d };
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
      bb: bollingerArr(closes, 20, 2),
      stoch: stochArr(series, 14, 3, 3),
    };
  }

  /* ---------------- Support / resistance ---------------- */
  function findLevels(series, startAbs, endAbs, tol) {
    const piv = [];
    for (let i = startAbs + 2; i <= endAbs - 2; i++) {
      const h = series[i].high,
        l = series[i].low;
      if (h >= series[i - 1].high && h >= series[i - 2].high && h >= series[i + 1].high && h >= series[i + 2].high)
        piv.push(h);
      if (l <= series[i - 1].low && l <= series[i - 2].low && l <= series[i + 1].low && l <= series[i + 2].low)
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

  /* ---------------- Fibonacci ---------------- */
  const FIB_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786];
  function computeFib(series, startAbs, endAbs, atr) {
    let hi = -Infinity,
      lo = Infinity,
      hiI = startAbs,
      loI = startAbs;
    for (let i = startAbs; i <= endAbs; i++) {
      if (series[i].high > hi) {
        hi = series[i].high;
        hiI = i;
      }
      if (series[i].low < lo) {
        lo = series[i].low;
        loI = i;
      }
    }
    if (!isFinite(hi) || !isFinite(lo) || hi - lo < (atr || 0) * 3) return null;
    const up = loI < hiI;
    return {
      up,
      hi,
      lo,
      levels: FIB_RATIOS.map((r) => ({ r, price: up ? hi - (hi - lo) * r : lo + (hi - lo) * r })),
    };
  }

  /* ---------------- Dates / storage / prefs ---------------- */
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function puzzleNumberFor(date) {
    return Math.floor((startOfDay(date) - CONFIG.EPOCH) / 86400000) + 1;
  }
  function dateForNumber(n) {
    const d = new Date(CONFIG.EPOCH);
    d.setDate(d.getDate() + (n - 1));
    return d;
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
        /* private mode / quota */
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
      readsCorrect: 0,
      readsTotal: 0,
      readsByKey: {},
      history: {},
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
    if (Array.isArray(raw.dist) && raw.dist.length === 7) d.dist = raw.dist.map((x) => clampInt(x, 0, 1e9));
    d.readsCorrect = clampInt(raw.readsCorrect, 0, 1e12);
    d.readsTotal = clampInt(raw.readsTotal, 0, 1e12);
    if (raw.readsByKey && typeof raw.readsByKey === "object") {
      for (const k of ALL_INDS) {
        const e = raw.readsByKey[k];
        if (e && typeof e === "object") {
          d.readsByKey[k] = { c: clampInt(e.c, 0, 1e9), t: clampInt(e.t, 0, 1e9) };
        }
      }
    }
    if (raw.history && typeof raw.history === "object") {
      for (const n in raw.history) {
        const num = clampInt(n, 1, 1e6);
        d.history[num] = clampInt(raw.history[n], 0, CONFIG.ROUNDS);
      }
    }
    return d;
  }

  function defaultSurvival() {
    return { best: { norm: 0, hard: 0, "norm-blitz": 0, "hard-blitz": 0 }, games: 0 };
  }
  function normalizeSurvival(raw) {
    const d = defaultSurvival();
    if (!raw || typeof raw !== "object") return d;
    d.games = clampInt(raw.games, 0, 1e9);
    if (raw.best && typeof raw.best === "object") {
      for (const k in d.best) d.best[k] = clampInt(raw.best[k], 0, 1e6);
    }
    return d;
  }

  function defaultBadgeStore() {
    return { earned: {}, levelsDone: [] };
  }
  function normalizeBadgeStore(raw) {
    const d = defaultBadgeStore();
    if (!raw || typeof raw !== "object") return d;
    if (raw.earned && typeof raw.earned === "object") {
      for (const b of BADGES) if (raw.earned[b.id]) d.earned[b.id] = clampInt(raw.earned[b.id], 0, 1e6);
    }
    if (Array.isArray(raw.levelsDone)) {
      d.levelsDone = raw.levelsDone.map((x) => clampInt(x, 1, LEVELS.length)).filter((v, i, a) => a.indexOf(v) === i);
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
      hard: false,
      blitz: false,
      real: false,
      indOn: { ma: true, vol: true, rsi: true, macd: true, sr: true, bb: true, stoch: true, fib: true },
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
    d.hard = raw.hard === true;
    d.blitz = raw.blitz === true;
    d.real = raw.real === true;
    if (raw.indOn && typeof raw.indOn === "object") {
      for (const k of ALL_INDS) d.indOn[k] = raw.indOn[k] !== false;
    }
    return d;
  }

  /* ---------------- Sound ---------------- */
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
  let prefs = normalizePrefs(Store.get(KEYS.prefs, null));
  let stats = {
    normal: normalizeStats(Store.get(KEYS.stats, null)),
    hard: normalizeStats(Store.get(KEYS.statsHard, null)),
  };
  let survival = normalizeSurvival(Store.get(KEYS.survival, null));
  let badgeStore = normalizeBadgeStore(Store.get(KEYS.badges, null));
  let academy = (function () {
    const raw = Store.get(KEYS.academy, null);
    const d = { done: [] };
    if (raw && Array.isArray(raw.done)) {
      d.done = raw.done.filter((id) => MISSIONS.some((m) => m.id === id));
    }
    return d;
  })();
  let academyListOpen = false;

  let game = null;
  let lastAnalysis = null;
  let hardReads = {};
  let practiceCounter = 0;
  let survivalCounter = 0;
  let busy = false;
  let countdownTimer = null;
  let statsView = "normal";
  let previewURL = null;
  let blitzTimer = { id: null, end: 0 };
  let newBadgesQueue = [];

  function t(key, vars) {
    const pack = STR[prefs.lang] || STR.en;
    let s = pack[key] != null ? pack[key] : STR.en[key] != null ? STR.en[key] : key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]));
    return s;
  }
  function bucketStats() {
    return game && game.hard ? stats.hard : stats.normal;
  }
  function saveStats() {
    Store.set(KEYS.stats, stats.normal);
    Store.set(KEYS.statsHard, stats.hard);
  }
  function surFlavor() {
    return (prefs.hard ? "hard" : "norm") + (prefs.blitz ? "-blitz" : "");
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
    stochWrap: $("#wrap-stoch"),
    stochPanel: $("#panel-stoch"),
    stochVal: $("#stoch-val"),
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
    tabSurvival: $("#tab-survival"),
    tabAcademy: $("#tab-academy"),
    levelbar: $("#levelbar"),
    indbar: $("#indbar"),
    btnHard: $("#btn-hard"),
    btnBlitz: $("#btn-blitz"),
    btnReal: $("#btn-real"),
    btnNewChart: $("#btn-newchart"),
    academyList: $("#academy-list"),
    missionBrief: $("#mission-brief"),
    mbTitle: $("#mb-title"),
    mbGoal: $("#mb-goal"),
    mbTip: $("#mb-tip"),
    realReveal: $("#real-reveal"),
    timer: $("#blitz-timer"),
    timerFill: $("#bt-fill"),
    timerSecs: $("#bt-secs"),
    reads: $("#reads"),
    readsList: $("#reads-list"),
    analysis: $("#analysis"),
    anTitle: $("#analysis-title"),
    anHeadline: $("#analysis-headline"),
    anLead: $("#analysis-lead"),
    anList: $("#analysis-list"),
    help: $("#modal-help"),
    helpBody: $("#help-body"),
    stats: $("#modal-stats"),
    result: $("#modal-result"),
    resultTitle: $("#result-title"),
    resultHeadline: $("#result-headline"),
    resultScore: $("#result-score"),
    resultGrid: $("#result-grid"),
    resultMini: $("#result-mini"),
    countdown: $("#countdown"),
    lesson: $("#lesson"),
    lessonName: $("#lesson-name"),
    lessonBody: $("#lesson-body"),
    sharePreview: $("#share-preview"),
    equity: $("#equity"),
    equityCap: $("#equity-cap"),
    equitySvg: $("#equity-svg"),
    newBadges: $("#new-badges"),
    btnPracticeRes: $("#btn-practice"),
  };

  function announce(msg) {
    dom.live.textContent = "";
    window.requestAnimationFrame(() => (dom.live.textContent = msg));
  }

  /* ---------------- Indicator visibility ---------------- */
  function activeIndSet() {
    if (game && game.mode === "academy") return new Set(game.mission.inds);
    if (!game || game.mode !== "practice") return new Set(ALL_INDS);
    return new Set(LEVELS[prefs.practiceLevel - 1].inds);
  }
  function hardActive() {
    return prefs.hard && game && game.mode !== "academy";
  }
  function displayedInds() {
    const act = activeIndSet();
    return new Set(ALL_INDS.filter((k) => act.has(k) && prefs.indOn[k]));
  }
  function readKeys() {
    return ALL_INDS.filter((k) => displayedInds().has(k));
  }

  /* ---------------- Geometry / view window ---------------- */
  function revealedTotal() {
    return CONFIG.HISTORY + game.round;
  }
  function lastRevealedAbs() {
    return VIS_START + revealedTotal() - 1;
  }
  // The chart always shows VISIBLE slots; in survival the window slides.
  function viewWin() {
    const revealed = revealedTotal();
    if (game.mode === "survival") {
      const nShow = Math.min(game.finished ? VISIBLE : VISIBLE - 1, revealed);
      const winStart = VIS_START + revealed - nShow;
      const divSlot = CONFIG.HISTORY - (revealed - nShow);
      return {
        winStart,
        nShow,
        divSlot: divSlot >= 0 && divSlot <= nShow ? divSlot : null,
        placeholder: !game.finished,
      };
    }
    const nShow = game.finished ? VISIBLE : Math.min(VISIBLE, revealed);
    return {
      winStart: VIS_START,
      nShow,
      divSlot: CONFIG.HISTORY,
      placeholder: !game.finished && nShow < VISIBLE,
    };
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
    const w = viewWin();
    const visible = game.series.slice(w.winStart, w.winStart + w.nShow);
    const ind = game.ind;
    const iLast = lastRevealedAbs();

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
    if (shown.has("bb")) {
      for (let v = 0; v < w.nShow; v++) {
        const u = ind.bb.up[w.winStart + v],
          l = ind.bb.lo[w.winStart + v];
        if (u != null && u > max) max = u;
        if (l != null && l < min) min = l;
      }
    }
    const span = max - min;
    min -= span * 0.07;
    max += span * 0.07;

    const yOf = (p) => padT + (1 - (p - min) / (max - min)) * priceH;
    const xC = (v) => padL + slotW * (v + 0.5);

    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const p = min + ((max - min) * i) / ticks;
      const y = yOf(p);
      svg("line", { class: "gridline", x1: padL, y1: y, x2: W - padR, y2: y }, c);
      const lb = svg("text", { class: "axislabel", x: padL - 5, y: y + 3, "text-anchor": "end" }, c);
      lb.textContent = p.toFixed(p < 100 ? 1 : 0);
    }

    if (w.divSlot != null) {
      const divX = padL + slotW * w.divSlot;
      svg("line", { class: "divider", x1: divX, y1: padT, x2: divX, y2: padT + priceH }, c);
      const dl = svg("text", { class: "divider-label", x: divX + 4, y: padT + 11 }, c);
      dl.textContent = "LIVE";
    }

    if (shown.has("bb")) {
      const upPts = [],
        loPts = [];
      for (let v = 0; v < w.nShow; v++) {
        const u = ind.bb.up[w.winStart + v],
          l = ind.bb.lo[w.winStart + v];
        if (u != null) upPts.push([xC(v), yOf(u)]);
        if (l != null) loPts.push([xC(v), yOf(l)]);
      }
      if (upPts.length > 1 && loPts.length > 1) {
        const d =
          "M" +
          upPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") +
          " L" +
          loPts
            .slice()
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
            .join(" L") +
          " Z";
        svg("path", { class: "bb-fill", d }, c);
        svg("polyline", { class: "bb-line", points: upPts.map((p) => p.join(",")).join(" ") }, c);
        svg("polyline", { class: "bb-line", points: loPts.map((p) => p.join(",")).join(" ") }, c);
      }
    }

    if (shown.has("fib")) {
      const fib = computeFib(game.series, w.winStart, iLast, ind.atr14[iLast]);
      if (fib) {
        for (const L of fib.levels) {
          if (L.price < min || L.price > max) continue;
          const y = yOf(L.price);
          svg("line", { class: "fib-line", x1: padL, y1: y, x2: W - padR, y2: y }, c);
          const lb = svg("text", { class: "fib-label", x: padL + 4, y: y - 3 }, c);
          lb.textContent = String(L.r);
        }
      }
    }

    if (shown.has("sr")) {
      const atr = ind.atr14[iLast] || game.series[iLast].close * 0.02;
      const close = game.series[iLast].close;
      const levels = findLevels(game.series, w.winStart, iLast, atr * 0.8);
      const res = levels.filter((L) => L.price > close).sort((a, b) => a.price - b.price).slice(0, 2);
      const sup = levels.filter((L) => L.price <= close).sort((a, b) => b.price - a.price).slice(0, 2);
      for (const group of [res, sup]) {
        for (const L of group) {
          if (L.price < min || L.price > max) continue;
          const y = yOf(L.price);
          const cls = group === res ? "res" : "sup";
          svg("line", { class: `srline ${cls}${L.touches < 2 ? " weak" : ""}`, x1: padL, y1: y, x2: W - padR, y2: y }, c);
          const lb = svg("text", { class: `sr-label ${cls}`, x: W - padR - 2, y: y - 3, "text-anchor": "end" }, c);
          lb.textContent = fmtPrice(L.price);
        }
      }
    }

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
      const pts = [];
      visible.forEach((k, v) => {
        const a = ind.volAvg10[w.winStart + v];
        if (a != null) pts.push(`${xC(v).toFixed(1)},${(volTop + volH - (a / vMax) * volH).toFixed(1)}`);
      });
      if (pts.length > 1) svg("polyline", { class: "vol-avg", points: pts.join(" ") }, c);
      const vl = svg("text", { class: "legend lg-vol", x: padL + 4, y: volTop + 10 }, c);
      vl.textContent = "VOL";
    }

    if (shown.has("ma")) {
      const mk = (arr, cls) => {
        const pts = [];
        for (let v = 0; v < w.nShow; v++) {
          const val = arr[w.winStart + v];
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

    const bodyW = Math.max(3, slotW * 0.58);
    visible.forEach((k, v) => {
      const isNew = !game.finished && v === w.nShow - 1 && game.round > 0;
      const g = svg("g", { class: "candle " + (k.bull ? "bull" : "bear") + (isNew ? " candle--new" : "") }, c);
      const x = xC(v);
      svg("line", { class: "wick", x1: x, y1: yOf(k.high), x2: x, y2: yOf(k.low) }, g);
      const yT = yOf(Math.max(k.open, k.close));
      const yB = yOf(Math.min(k.open, k.close));
      svg("rect", { class: "body", x: x - bodyW / 2, y: yT, width: bodyW, height: Math.max(1.5, yB - yT), rx: 1.2 }, g);
    });

    if (w.placeholder) {
      const px = xC(w.nShow);
      svg("rect", { class: "placeholder-band", x: px - slotW / 2, y: padT, width: slotW, height: priceH }, c);
      const q = svg("text", { class: "placeholder-q", x: px, y: padT + priceH / 2 }, c);
      q.textContent = "?";
    }

    const last = visible[visible.length - 1];
    if (game.finished) {
      c.setAttribute("aria-label", `Final chart. Score ${score()}.`);
    } else {
      c.setAttribute(
        "aria-label",
        `Round ${game.round + 1}. Last candle closed ${last.bull ? "green" : "red"}. Call the next candle.`
      );
    }
  }

  /* ---------------- Oscillator panels ---------------- */
  function renderOscPanel(c, drawFn) {
    while (c.firstChild) c.removeChild(c.firstChild);
    const { W, padL, padR } = chartGeom();
    const H = 86,
      padT = 6,
      padB = 6,
      h = H - padT - padB;
    c.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const slotW = (W - padL - padR) / VISIBLE;
    drawFn({ c, W, padL, padR, padT, h, slotW, xC: (v) => padL + slotW * (v + 0.5) });
  }

  function renderRsi() {
    renderOscPanel(dom.rsiPanel, ({ c, W, padL, padR, padT, h, xC }) => {
      const yOf = (val) => padT + (1 - val / 100) * h;
      svg("rect", { class: "rsi-zone", x: padL, y: yOf(70), width: W - padL - padR, height: yOf(30) - yOf(70) }, c);
      for (const lvl of [70, 30]) {
        svg("line", { class: "rsi-band", x1: padL, y1: yOf(lvl), x2: W - padR, y2: yOf(lvl) }, c);
        const lb = svg("text", { class: "axislabel", x: padL - 5, y: yOf(lvl) + 3, "text-anchor": "end" }, c);
        lb.textContent = lvl;
      }
      const w = viewWin();
      const pts = [];
      for (let v = 0; v < w.nShow; v++) {
        const val = game.ind.rsi14[w.winStart + v];
        if (val != null) pts.push(`${xC(v).toFixed(1)},${yOf(val).toFixed(1)}`);
      }
      if (pts.length > 1) svg("polyline", { class: "rsi-line", points: pts.join(" ") }, c);
    });
  }

  function renderStochPanel() {
    renderOscPanel(dom.stochPanel, ({ c, W, padL, padR, padT, h, xC }) => {
      const yOf = (val) => padT + (1 - val / 100) * h;
      svg("rect", { class: "rsi-zone", x: padL, y: yOf(80), width: W - padL - padR, height: yOf(20) - yOf(80) }, c);
      for (const lvl of [80, 20]) {
        svg("line", { class: "rsi-band", x1: padL, y1: yOf(lvl), x2: W - padR, y2: yOf(lvl) }, c);
        const lb = svg("text", { class: "axislabel", x: padL - 5, y: yOf(lvl) + 3, "text-anchor": "end" }, c);
        lb.textContent = lvl;
      }
      const w = viewWin();
      const mk = (arr, cls) => {
        const pts = [];
        for (let v = 0; v < w.nShow; v++) {
          const val = arr[w.winStart + v];
          if (val != null) pts.push(`${xC(v).toFixed(1)},${yOf(val).toFixed(1)}`);
        }
        if (pts.length > 1) svg("polyline", { class: cls, points: pts.join(" ") }, c);
      };
      mk(game.ind.stoch.d, "stoch-d");
      mk(game.ind.stoch.k, "stoch-k");
    });
  }

  function renderMacd() {
    renderOscPanel(dom.macdPanel, ({ c, W, padL, padR, padT, h, slotW, xC }) => {
      const w = viewWin();
      const { line, signal, hist } = game.ind.macd;
      let m = 0;
      for (let v = 0; v < w.nShow; v++) {
        const i = w.winStart + v;
        for (const arr of [line, signal, hist]) {
          if (arr[i] != null && Math.abs(arr[i]) > m) m = Math.abs(arr[i]);
        }
      }
      if (m === 0) m = 1;
      const mid = padT + h / 2;
      const yOf = (val) => mid - (val / m) * (h / 2 - 4);
      svg("line", { class: "zero-line", x1: padL, y1: mid, x2: W - padR, y2: mid }, c);
      const bw = Math.max(2, slotW * 0.5);
      for (let v = 0; v < w.nShow; v++) {
        const hv = hist[w.winStart + v];
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
        for (let v = 0; v < w.nShow; v++) {
          const val = arr[w.winStart + v];
          if (val != null) pts.push(`${xC(v).toFixed(1)},${yOf(val).toFixed(1)}`);
        }
        if (pts.length > 1) svg("polyline", { class: cls, points: pts.join(" ") }, c);
      };
      mk(line, "macd-line");
      mk(signal, "sig-line");
    });
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

    const k = game.ind.stoch.k[i];
    dom.stochVal.textContent = k == null ? "—" : Math.round(k);
    dom.stochVal.className = "pane-val" + (k >= 80 ? " val-ob" : k <= 20 ? " val-os" : "");
  }

  function renderCharts() {
    if (!game || academyListOpen) return;
    const shown = displayedInds();
    dom.rsiWrap.hidden = !shown.has("rsi");
    dom.macdWrap.hidden = !shown.has("macd");
    dom.stochWrap.hidden = !shown.has("stoch");
    renderMain();
    if (shown.has("rsi")) renderRsi();
    if (shown.has("macd")) renderMacd();
    if (shown.has("stoch")) renderStochPanel();
    updateReadouts();
  }

  /* ---------------- Signals ---------------- */
  function computeSignals() {
    const i = lastRevealedAbs();
    const s = game.series;
    const ind = game.ind;
    const close = s[i].close;
    const shown = displayedInds();
    const w = viewWin();
    const out = [];

    if (shown.has("ma")) {
      const ef = ind.ema9[i],
        es = ind.sma20[i];
      if (ef != null && es != null) {
        if (ef > es && close > es) out.push({ key: "ma", tKey: "sig_trend_up", dir: 1, w: 2 });
        else if (ef < es && close < es) out.push({ key: "ma", tKey: "sig_trend_down", dir: -1, w: 2 });
        else out.push({ key: "ma", tKey: "sig_trend_mixed", dir: 0, w: 0 });
      }
    }

    if (shown.has("rsi")) {
      const v = ind.rsi14[i];
      if (v != null) {
        const r = Math.round(v);
        if (v >= 70) out.push({ key: "rsi", tKey: "sig_rsi_ob", vars: { v: r }, dir: -1, w: 1 });
        else if (v <= 30) out.push({ key: "rsi", tKey: "sig_rsi_os", vars: { v: r }, dir: 1, w: 1 });
        else if (v >= 55) out.push({ key: "rsi", tKey: "sig_rsi_bull", vars: { v: r }, dir: 1, w: 1 });
        else if (v <= 45) out.push({ key: "rsi", tKey: "sig_rsi_bear", vars: { v: r }, dir: -1, w: 1 });
        else out.push({ key: "rsi", tKey: "sig_rsi_flat", vars: { v: r }, dir: 0, w: 0 });
      }
    }

    if (shown.has("macd")) {
      const h = ind.macd.hist[i],
        hp = ind.macd.hist[i - 1];
      if (h != null && hp != null) {
        const eps = close * 0.0001;
        if (h > eps && h >= hp) out.push({ key: "macd", tKey: "sig_macd_bull", dir: 1, w: 1 });
        else if (h < -eps && h <= hp) out.push({ key: "macd", tKey: "sig_macd_bear", dir: -1, w: 1 });
        else if (h > eps && h < hp) out.push({ key: "macd", tKey: "sig_macd_fadeup", dir: 0, w: 0 });
        else if (h < -eps && h > hp) out.push({ key: "macd", tKey: "sig_macd_fadedown", dir: 0, w: 0 });
        else out.push({ key: "macd", tKey: "sig_macd_flat", dir: 0, w: 0 });
      }
    }

    if (shown.has("sr")) {
      const atr = ind.atr14[i] || close * 0.02;
      const levels = findLevels(s, w.winStart, i, atr * 0.8);
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
        out.push({ key: "sr", tKey: "sig_sr_res", vars: { lvl: fmtPrice(res.price) }, dir: -1, w: 1 });
      else if (nearSup) out.push({ key: "sr", tKey: "sig_sr_sup", vars: { lvl: fmtPrice(sup.price) }, dir: 1, w: 1 });
      else out.push({ key: "sr", tKey: "sig_sr_none", dir: 0, w: 0 });
    }

    if (shown.has("vol")) {
      const v = s[i].volume,
        a = ind.volAvg10[i];
      if (a) {
        if (v > a * 1.25)
          out.push({
            key: "vol",
            tKey: "sig_vol_conf",
            vars: { colorKey: s[i].bull ? "w_greens" : "w_reds" },
            dir: s[i].bull ? 1 : -1,
            w: 1,
          });
        else if (v < a * 0.75) out.push({ key: "vol", tKey: "sig_vol_low", dir: 0, w: 0 });
        else out.push({ key: "vol", tKey: "sig_vol_norm", dir: 0, w: 0 });
      }
    }

    if (shown.has("bb")) {
      const up = ind.bb.up[i],
        lo = ind.bb.lo[i],
        mid = ind.sma20[i];
      if (up != null && lo != null && mid) {
        let wSum = 0,
          wN = 0;
        for (let v = 0; v < w.nShow; v++) {
          const u2 = ind.bb.up[w.winStart + v],
            l2 = ind.bb.lo[w.winStart + v],
            m2 = ind.sma20[w.winStart + v];
          if (u2 != null && l2 != null && m2) {
            wSum += (u2 - l2) / m2;
            wN++;
          }
        }
        const avgW = wN ? wSum / wN : 0;
        const width = (up - lo) / mid;
        if (close > up) out.push({ key: "bb", tKey: "sig_bb_above", dir: -1, w: 1 });
        else if (close < lo) out.push({ key: "bb", tKey: "sig_bb_below", dir: 1, w: 1 });
        else if (avgW && width < avgW * 0.65) out.push({ key: "bb", tKey: "sig_bb_squeeze", dir: 0, w: 0 });
        else out.push({ key: "bb", tKey: "sig_bb_inside", dir: 0, w: 0 });
      }
    }

    if (shown.has("stoch")) {
      const k = ind.stoch.k[i],
        d = ind.stoch.d[i],
        kp = ind.stoch.k[i - 1],
        dp = ind.stoch.d[i - 1];
      if (k != null && d != null) {
        const r = Math.round(k);
        const xUp = kp != null && dp != null && kp <= dp && k > d;
        const xDown = kp != null && dp != null && kp >= dp && k < d;
        if (k >= 80) out.push({ key: "stoch", tKey: "sig_stoch_ob", vars: { k: r }, dir: -1, w: 1 });
        else if (k <= 20) out.push({ key: "stoch", tKey: "sig_stoch_os", vars: { k: r }, dir: 1, w: 1 });
        else if (xUp) out.push({ key: "stoch", tKey: "sig_stoch_xup", dir: 1, w: 1 });
        else if (xDown) out.push({ key: "stoch", tKey: "sig_stoch_xdown", dir: -1, w: 1 });
        else out.push({ key: "stoch", tKey: "sig_stoch_flat", vars: { k: r }, dir: 0, w: 0 });
      }
    }

    if (shown.has("fib")) {
      const atr = ind.atr14[i] || close * 0.02;
      const fib = computeFib(s, w.winStart, i, atr);
      let pushed = false;
      if (fib) {
        let best = null;
        for (const L of fib.levels) {
          const dst = Math.abs(close - L.price);
          if (dst <= atr * 0.35 && (!best || dst < best.dst)) best = { L, dst };
        }
        if (best) {
          out.push({
            key: "fib",
            tKey: fib.up ? "sig_fib_sup" : "sig_fib_res",
            vars: { r: best.L.r },
            dir: fib.up ? 1 : -1,
            w: 1,
          });
          pushed = true;
        }
      }
      if (!pushed) out.push({ key: "fib", tKey: "sig_fib_none", dir: 0, w: 0 });
    }

    let n = 1;
    while (n < 6 && s[i - n] && s[i - n].bull === s[i].bull) n++;
    if (n >= 3)
      out.push({
        key: "streak",
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

  /* ---------------- HARD reads ---------------- */
  let readsCursor = 0; // keyboard cursor over the reads list

  function readsComplete() {
    const keys = readKeys();
    return keys.every((k) => hardReads[k] === 1 || hardReads[k] === 0 || hardReads[k] === -1);
  }

  // keyboard tagging: 1=▲ 2=• 3=▼ on the cursor row, then advance
  function tagCursorRead(dir) {
    const keys = readKeys();
    if (!keys.length) return;
    if (readsCursor >= keys.length) readsCursor = 0;
    hardReads[keys[readsCursor]] = dir;
    // advance to the next untagged row (or just the next one)
    const next = keys.findIndex((k, i) => i > readsCursor && hardReads[k] === undefined);
    readsCursor = next !== -1 ? next : Math.min(readsCursor + 1, keys.length - 1);
    renderReads();
    updateCallGate();
  }

  function renderReads() {
    const show = hardActive() && !game.finished && readKeys().length > 0;
    dom.reads.hidden = !show;
    if (!show) return;
    dom.readsList.innerHTML = "";
    const cursorKeys = readKeys();
    for (const k of cursorKeys) {
      const li = document.createElement("li");
      li.className = "read-row" + (cursorKeys[readsCursor] === k ? " cursor" : "");

      const name = document.createElement("span");
      name.className = "read-name";
      name.textContent = t("ind_name_" + k);

      const btns = document.createElement("span");
      btns.className = "read-btns";
      for (const [dir, cls, sym] of [[1, "up", "▲"], [0, "flat", "•"], [-1, "down", "▼"]]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "read-btn " + cls;
        b.textContent = sym;
        b.setAttribute("aria-pressed", String(hardReads[k] === dir));
        b.addEventListener("click", () => {
          if (busy || game.finished) return;
          hardReads[k] = dir;
          readsCursor = readKeys().indexOf(k);
          renderReads();
          updateCallGate();
        });
        btns.appendChild(b);
      }

      const verdict = document.createElement("span");
      verdict.className = "read-verdict";
      verdict.textContent = "";

      li.appendChild(name);
      li.appendChild(btns);
      li.appendChild(verdict);
      dom.readsList.appendChild(li);
    }
  }

  function updateCallGate() {
    if (!game || game.finished) return;
    const gateOpen = !hardActive() || readsComplete() || readKeys().length === 0;
    dom.bull.disabled = busy || !gateOpen;
    dom.bear.disabled = busy || !gateOpen;
  }

  /* ---------------- Blitz timer ---------------- */
  function blitzSeconds() {
    return prefs.hard ? CONFIG.BLITZ_S_HARD : CONFIG.BLITZ_S;
  }
  function blitzActive() {
    return prefs.blitz && game && (game.mode === "practice" || game.mode === "survival") && !game.finished;
  }
  function stopTimer() {
    if (blitzTimer.id) {
      window.clearInterval(blitzTimer.id);
      blitzTimer.id = null;
    }
  }
  function scheduleTimer() {
    stopTimer();
    if (!blitzActive()) {
      dom.timer.hidden = true;
      return;
    }
    dom.timer.hidden = false;
    const total = blitzSeconds() * 1000;
    blitzTimer.end = performance.now() + total;
    const tick = () => {
      const left = blitzTimer.end - performance.now();
      if (left <= 0) {
        stopTimer();
        dom.timerFill.style.width = "0%";
        dom.timerSecs.textContent = "0";
        timeoutRound();
        return;
      }
      const pct = (left / total) * 100;
      dom.timerFill.style.width = pct.toFixed(1) + "%";
      dom.timerFill.classList.toggle("low", pct < 30);
      dom.timerSecs.textContent = String(Math.ceil(left / 1000));
    };
    tick();
    blitzTimer.id = window.setInterval(tick, 100);
  }

  /* ---------------- Analysis card ---------------- */
  function renderAnalysis() {
    if (!lastAnalysis) {
      dom.analysis.hidden = true;
      return;
    }
    const { round, signals, consensus, userDir, actualDir, reads, timeout } = lastAnalysis;
    dom.analysis.hidden = false;
    dom.anTitle.textContent = t("analysis_title", { n: round });

    const cDir = Math.sign(consensus);
    let hKey, hClass;
    if (timeout) {
      hKey = "an_timeout";
      hClass = "bad";
    } else if (userDir === actualDir) {
      hKey = cDir === 0 ? "an_correct_mixed" : cDir !== userDir ? "an_correct_against" : "an_correct_with";
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
    dom.anHeadline.textContent = t(hKey, { word: t(actualDir > 0 ? "word_up" : "word_down") });
    dom.anHeadline.className = "an-headline " + hClass;

    const leadTxt =
      cDir > 0 ? t("lead_up", { s: "+" + consensus }) : cDir < 0 ? t("lead_down", { s: String(consensus) }) : t("lead_flat");
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

      if (reads && Object.prototype.hasOwnProperty.call(reads, sig.key)) {
        const you = document.createElement("span");
        you.className = "an-you";
        const ud = reads[sig.key];
        const sym = ud > 0 ? "▲" : ud < 0 ? "▼" : "•";
        const ok = ud === sig.dir;
        you.innerHTML = ` ${t("you_said")} <span class="${ok ? "hit" : "miss"}">${sym}${ok ? "✓" : "✗"}</span>`;
        txt.appendChild(you);
      }

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
      li.classList.add("an-clickable");
      li.title = t("ind_name_" + sig.key);
      li.addEventListener("click", () => highlightIndicator(sig.key));
      dom.anList.appendChild(li);
    }
  }

  // clicking an analysis row flashes the matching indicator panel/chart
  function highlightIndicator(key) {
    const target =
      key === "rsi" ? dom.rsiWrap : key === "macd" ? dom.macdWrap : key === "stoch" ? dom.stochWrap : dom.chartWrap;
    if (!target || target.hidden) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("flash-ind");
    void target.offsetWidth; // restart animation
    target.classList.add("flash-ind");
    window.setTimeout(() => target.classList.remove("flash-ind"), 1300);
  }

  /* ---------------- Progress / score ---------------- */
  function renderProgress() {
    const ol = dom.progress;
    while (ol.firstChild) ol.removeChild(ol.firstChild);
    if (academyListOpen) return;
    if (game.mode === "survival") {
      const li = document.createElement("li");
      li.className = "sur-lives";
      li.innerHTML =
        "❤️".repeat(game.lives) +
        "🖤".repeat(CONFIG.SUR_LIVES - game.lives) +
        `<span class="sur-round">R${game.round}</span>`;
      ol.appendChild(li);
      return;
    }
    for (let i = 0; i < CONFIG.ROUNDS; i++) {
      const li = document.createElement("li");
      if (i < game.results.length) li.classList.add(game.results[i] ? "is-correct" : "is-wrong");
      else if (i === game.round && !game.finished) li.classList.add("is-current");
      ol.appendChild(li);
    }
  }
  function score() {
    return game.results.filter(Boolean).length;
  }
  function renderScore() {
    if (game.mode === "survival") {
      dom.score.innerHTML = `${t("score_label")} <strong>${score()}</strong> / ${game.round}`;
    } else {
      dom.score.innerHTML = `${t("score_label")} <strong>${score()}</strong> / ${CONFIG.ROUNDS}`;
    }
  }
  function setControls(enabled) {
    if (!enabled) {
      dom.bull.disabled = true;
      dom.bear.disabled = true;
    } else {
      updateCallGate();
    }
  }

  /* ---------------- Mode bars ---------------- */
  function renderModeBars() {
    const mode = academyListOpen ? "academy" : game ? game.mode : "daily";
    dom.tabDaily.setAttribute("aria-selected", String(mode === "daily"));
    dom.tabPractice.setAttribute("aria-selected", String(mode === "practice"));
    dom.tabSurvival.setAttribute("aria-selected", String(mode === "survival"));
    dom.tabAcademy.setAttribute("aria-selected", String(mode === "academy"));
    dom.levelbar.hidden = mode !== "practice";
    dom.btnNewChart.hidden = mode === "daily" || mode === "academy";
    dom.btnBlitz.hidden = mode === "daily" || mode === "academy";
    dom.btnHard.hidden = mode === "academy";
    dom.btnReal.hidden = mode !== "practice";
    dom.btnHard.setAttribute("aria-pressed", String(prefs.hard));
    dom.btnBlitz.setAttribute("aria-pressed", String(prefs.blitz));
    dom.btnReal.setAttribute("aria-pressed", String(prefs.real));
    $$("#levelbar button").forEach((b) => {
      b.classList.toggle("is-active", Number(b.dataset.level) === prefs.practiceLevel);
    });
    const act = activeIndSet();
    $$("#indbar .ind-chip").forEach((b) => {
      const k = b.dataset.ind;
      b.hidden = !act.has(k);
      b.setAttribute("aria-pressed", String(prefs.indOn[k] !== false));
    });
    dom.indbar.hidden = act.size === 0 || mode === "academy";
  }

  /* ---------------- Academy ---------------- */
  function missionIndex(m) {
    return MISSIONS.findIndex((x) => x.id === m.id);
  }
  function missionUnlocked(idx) {
    return idx === 0 || academy.done.includes(MISSIONS[idx - 1].id);
  }
  function saveAcademy() {
    Store.set(KEYS.academy, academy);
  }

  function setGameAreaHidden(hide) {
    const els = [
      dom.chartWrap,
      $("#question"),
      $("#controls"),
      $(".status"),
      dom.analysis,
      dom.reads,
      dom.timer,
    ];
    for (const el of els) {
      if (!el) continue;
      if (hide) el.setAttribute("data-acad-hidden", "1");
      else el.removeAttribute("data-acad-hidden");
      el.style.display = hide ? "none" : "";
    }
    if (hide) {
      dom.rsiWrap.hidden = true;
      dom.macdWrap.hidden = true;
      dom.stochWrap.hidden = true;
      dom.missionBrief.hidden = true;
    }
  }

  function renderAcademyList() {
    const wrap = dom.academyList;
    wrap.innerHTML = "";
    const head = document.createElement("div");
    head.className = "academy__head";
    const ht = document.createElement("span");
    ht.textContent = t("academy_title");
    const hp = document.createElement("strong");
    hp.textContent = t("academy_progress", { a: academy.done.length, b: MISSIONS.length });
    head.appendChild(ht);
    head.appendChild(hp);
    wrap.appendChild(head);

    MISSIONS.forEach((m, idx) => {
      const done = academy.done.includes(m.id);
      const unlocked = missionUnlocked(idx);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "mission" + (done ? " done" : "");
      card.disabled = !unlocked;

      const icon = document.createElement("span");
      icon.className = "m-icon";
      icon.textContent = m.icon;

      const body = document.createElement("span");
      body.className = "m-name";
      body.textContent = `${idx + 1}. ${t(m.id + "_t")}`;
      const goal = document.createElement("span");
      goal.className = "m-goal";
      goal.textContent = t("mis_goal", { n: m.pass });
      body.appendChild(goal);

      const status = document.createElement("span");
      status.className = "m-status";
      status.textContent = done ? "✓" : unlocked ? "▶" : "🔒";

      card.appendChild(icon);
      card.appendChild(body);
      card.appendChild(status);
      if (unlocked) card.addEventListener("click", () => startMission(m));
      wrap.appendChild(card);
    });
  }

  function showAcademyList() {
    stopTimer();
    academyListOpen = true;
    closeAllModals();
    dom.progress.innerHTML = "";
    renderAcademyList();
    dom.academyList.hidden = false;
    setGameAreaHidden(true);
    renderModeBars();
    dom.modeWord.textContent = t("tab_academy");
    dom.number.textContent = "";
    dom.date.textContent = t("academy_progress", { a: academy.done.length, b: MISSIONS.length });
  }

  function renderMissionBrief() {
    if (!game || game.mode !== "academy") {
      dom.missionBrief.hidden = true;
      return;
    }
    const m = game.mission;
    dom.mbTitle.textContent = `${m.icon} ${t(m.id + "_t")}`;
    dom.mbGoal.textContent = t("mis_goal", { n: m.pass });
    dom.mbTip.textContent = t(m.id + "_b");
    dom.missionBrief.hidden = false;
  }

  function startMission(m) {
    stopTimer();
    academyListOpen = false;
    dom.academyList.hidden = true;
    setGameAreaHidden(false);
    const seedStr = "candle-academy-" + m.id + "-" + Math.floor(performance.now());
    const series = generateSeries(seedStr, GEN_TOTAL);
    game = {
      mode: "academy",
      hard: false,
      blitz: false,
      mission: m,
      number: missionIndex(m) + 1,
      series,
      ind: computeIndicators(series),
      round: 0,
      results: [],
      finished: false,
      readsCorrect: 0,
      readsTotal: 0,
      readsByKey: {},
      lives: 0,
      missionPassed: false,
    };
    lastAnalysis = null;
    hardReads = {};
    readsCursor = 0;
    updateMetaTitle();
    refreshAll();
    closeAllModals();
  }

  function updateMetaTitle() {
    if (game.mode === "academy") {
      dom.modeWord.innerHTML = t("tab_academy");
      dom.number.textContent = "#M" + game.number;
      dom.date.textContent = t(game.mission.id + "_t") + " · " + t("mis_goal", { n: game.mission.pass });
      return;
    }
    const base = t(
      game.mode === "daily" ? "tab_daily" : game.mode === "survival" ? "tab_survival" : "tab_practice"
    );
    const marks =
      (prefs.hard ? ' <span class="hard-badge">HARD</span>' : "") +
      (prefs.blitz && game.mode !== "daily" ? ' <span class="hard-badge" style="color:var(--accent)">⚡</span>' : "");
    dom.modeWord.innerHTML = base + marks;
    dom.number.textContent = "#" + game.number;
    if (game.mode === "daily") dom.date.textContent = formatDate(new Date());
    else if (game.mode === "survival")
      dom.date.textContent = t("sur_sub") + ` · ${t("mini_best")}: ${survival.best[surFlavor()] || 0}`;
    else dom.date.textContent = game.real ? t("practice_sub_real") : t("practice_sub");
  }

  function leaveAcademyList() {
    academyListOpen = false;
    dom.academyList.hidden = true;
    setGameAreaHidden(false);
  }

  /* ---------------- Core loop ---------------- */
  function startDaily() {
    stopTimer();
    leaveAcademyList();
    const today = new Date();
    const number = puzzleNumberFor(today);
    const saved = Store.get(KEYS.daily(number, prefs.hard), null);
    const series = generateSeries("candle-daily-" + number, GEN_TOTAL);
    game = {
      mode: "daily",
      hard: prefs.hard,
      blitz: false,
      number,
      series,
      ind: computeIndicators(series),
      round: saved ? clampInt(saved.round, 0, CONFIG.ROUNDS) : 0,
      results: saved && Array.isArray(saved.results) ? saved.results.map(Boolean).slice(0, CONFIG.ROUNDS) : [],
      finished: saved ? !!saved.finished : false,
      readsCorrect: saved ? clampInt(saved.readsCorrect, 0, 999) : 0,
      readsTotal: saved ? clampInt(saved.readsTotal, 0, 999) : 0,
      readsByKey: saved && saved.readsByKey && typeof saved.readsByKey === "object" ? saved.readsByKey : {},
      lives: 0,
    };
    lastAnalysis = null;
    hardReads = {};
    readsCursor = 0;
    updateMetaTitle();
    refreshAll();
    if (game.finished) {
      setControls(false);
      openResult(false);
    }
  }

  function buildPracticeGame(series, real) {
    game = {
      mode: "practice",
      hard: prefs.hard,
      blitz: prefs.blitz,
      number: practiceCounter,
      series,
      ind: computeIndicators(series),
      round: 0,
      results: [],
      finished: false,
      readsCorrect: 0,
      readsTotal: 0,
      readsByKey: {},
      lives: 0,
      real: real || null,
    };
    lastAnalysis = null;
    hardReads = {};
    readsCursor = 0;
    updateMetaTitle();
    refreshAll();
    closeAllModals();
    announce(t("ann_practice"));
  }

  function startPractice() {
    stopTimer();
    leaveAcademyList();
    practiceCounter += 1;
    const seedStr = "candle-practice-" + practiceCounter + "-" + Math.floor(performance.now());
    if (prefs.real) {
      // real history: fetch asynchronously, fall back to the simulator
      closeAllModals();
      setControls(false);
      dom.feedback.textContent = t("real_loading");
      dom.feedback.className = "feedback";
      fetchRealSeries()
        .then(({ series, real }) => buildPracticeGame(series, real))
        .catch(() => {
          buildPracticeGame(generateSeries(seedStr, GEN_TOTAL), null);
          dom.feedback.textContent = t("real_fail");
          dom.feedback.className = "feedback bad";
        });
      return;
    }
    buildPracticeGame(generateSeries(seedStr, GEN_TOTAL), null);
  }

  /* ---------------- Real market data (free public API, no key) ---------------- */
  async function fetchRealSeries() {
    const sym = Math.random() < 0.5 ? "BTCUSDT" : "ETHUSDT";
    const earliest = Date.UTC(2017, 8, 15);
    const latest = Date.now() - (GEN_TOTAL + 5) * 86400000;
    const start = Math.floor(earliest + Math.random() * (latest - earliest));
    const qs = `symbol=${sym}&interval=1d&limit=${GEN_TOTAL}&startTime=${start}`;
    const hosts = ["https://data-api.binance.vision", "https://api.binance.com"];
    let rows = null;
    for (const h of hosts) {
      try {
        const ctl = new AbortController();
        const to = window.setTimeout(() => ctl.abort(), 6000);
        const res = await fetch(`${h}/api/v3/klines?${qs}`, { signal: ctl.signal });
        window.clearTimeout(to);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length === GEN_TOTAL) {
          rows = data;
          break;
        }
      } catch {
        /* try next host */
      }
    }
    if (!rows) throw new Error("no data");

    // anonymize: rebase prices to 100 and volumes to ~85 average
    const f = 100 / parseFloat(rows[0][4]);
    let volSum = 0;
    for (const r of rows) volSum += parseFloat(r[5]);
    const vf = 85 / (volSum / rows.length || 1);
    const series = rows.map((r) => {
      const o = parseFloat(r[1]) * f,
        h2 = parseFloat(r[2]) * f,
        l = parseFloat(r[3]) * f,
        c = parseFloat(r[4]) * f;
      return {
        open: o,
        high: h2,
        low: l,
        close: c,
        bull: c >= o,
        volume: Math.max(5, Math.round(parseFloat(r[5]) * vf)),
      };
    });
    const fmt = (ts) =>
      new Date(ts).toLocaleDateString(prefs.lang === "pl" ? "pl-PL" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    return {
      series,
      real: {
        sym: sym === "BTCUSDT" ? "BTC/USDT" : "ETH/USDT",
        from: fmt(rows[VIS_START][0]),
        to: fmt(rows[rows.length - 1][6]),
      },
    };
  }

  function startSurvival() {
    stopTimer();
    leaveAcademyList();
    survivalCounter += 1;
    const seedStr = "candle-survival-" + survivalCounter + "-" + Math.floor(performance.now());
    const series = generateSeries(seedStr, SUR_TOTAL);
    game = {
      mode: "survival",
      hard: prefs.hard,
      blitz: prefs.blitz,
      number: survivalCounter,
      series,
      ind: computeIndicators(series),
      round: 0,
      results: [],
      finished: false,
      readsCorrect: 0,
      readsTotal: 0,
      readsByKey: {},
      lives: CONFIG.SUR_LIVES,
    };
    lastAnalysis = null;
    hardReads = {};
    readsCursor = 0;
    updateMetaTitle();
    refreshAll();
    closeAllModals();
    announce(t("ann_survival"));
  }

  function refreshAll() {
    renderModeBars();
    renderMissionBrief();
    renderCharts();
    renderProgress();
    renderScore();
    renderAnalysis();
    renderReads();
    setControls(!game.finished);
    scheduleTimer();
    dom.feedback.textContent = "";
    dom.feedback.className = "feedback";
  }

  function roundsLeft() {
    if (game.mode === "survival") return game.lives > 0 && game.round < CONFIG.SUR_MAX;
    return game.round < CONFIG.ROUNDS;
  }

  function resolveRound(predictBull, isTimeout) {
    busy = true;
    stopTimer();
    setControls(false);

    const signals = computeSignals();
    const consensus = consensusOf(signals);

    let readsSnapshot = null;
    if (!isTimeout && hardActive() && readKeys().length > 0) {
      readsSnapshot = Object.assign({}, hardReads);
      for (const sig of signals) {
        if (Object.prototype.hasOwnProperty.call(readsSnapshot, sig.key)) {
          game.readsTotal += 1;
          if (!game.readsByKey[sig.key]) game.readsByKey[sig.key] = { c: 0, t: 0 };
          game.readsByKey[sig.key].t += 1;
          if (readsSnapshot[sig.key] === sig.dir) {
            game.readsCorrect += 1;
            game.readsByKey[sig.key].c += 1;
          }
        }
      }
    }

    const target = game.series[VIS_START + CONFIG.HISTORY + game.round];
    const correct = isTimeout ? false : target.bull === predictBull;
    game.results.push(correct);
    game.round += 1;
    if (game.mode === "survival" && !correct) game.lives -= 1;

    lastAnalysis = {
      round: game.round,
      signals,
      consensus,
      userDir: isTimeout ? 0 : predictBull ? 1 : -1,
      actualDir: target.bull ? 1 : -1,
      reads: readsSnapshot,
      timeout: !!isTimeout,
    };

    hardReads = {};
    readsCursor = 0;
    renderCharts();
    renderProgress();
    renderScore();
    renderAnalysis();
    renderReads();

    if (game.mode === "daily") saveDaily();

    Sound.play(correct ? "good" : "bad");
    if (isTimeout) {
      dom.feedback.textContent = t("fb_timeout");
      dom.feedback.className = "feedback bad";
      announce(t("fb_timeout"));
    } else {
      flashFeedback(correct, target.bull);
    }

    window.setTimeout(() => {
      busy = false;
      if (!roundsLeft()) {
        finishGame();
      } else {
        setControls(true);
        renderCharts();
        renderProgress();
        renderReads();
        scheduleTimer();
      }
    }, 620);
  }

  function call(predictBull) {
    if (busy || !game || game.finished) return;
    if (!roundsLeft()) return;
    if (hardActive() && readKeys().length > 0 && !readsComplete()) {
      dom.feedback.textContent = t("fb_tag_first");
      dom.feedback.className = "feedback bad";
      return;
    }
    resolveRound(predictBull, false);
  }

  function timeoutRound() {
    if (busy || !game || game.finished) return;
    if (!roundsLeft()) return;
    resolveRound(false, true);
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
    stopTimer();
    dom.timer.hidden = true;
    setControls(false);
    renderCharts();
    renderProgress();
    renderReads();

    let surNewRecord = false;
    if (game.mode === "daily") {
      recordDailyResult();
      saveDaily();
    } else if (game.mode === "survival") {
      surNewRecord = recordSurvival();
    } else if (game.mode === "academy") {
      game.missionPassed = score() >= game.mission.pass;
      if (game.missionPassed && !academy.done.includes(game.mission.id)) {
        academy.done.push(game.mission.id);
        saveAcademy();
      }
    }
    if (game.mode === "practice" && !badgeStore.levelsDone.includes(prefs.practiceLevel)) {
      badgeStore.levelsDone.push(prefs.practiceLevel);
      Store.set(KEYS.badges, badgeStore);
    }
    evaluateBadges();

    const won = game.mode === "survival" ? score() >= 10 : score() >= CONFIG.PASS;
    window.setTimeout(() => {
      Sound.play(won ? "win" : "bad");
      openResult(true, surNewRecord);
    }, 450);
  }

  /* ---------------- Stats + persistence ---------------- */
  function recordDailyResult() {
    const st = bucketStats();
    if (st.lastNumber === game.number) return;
    const s = score();
    const pass = s >= CONFIG.PASS;

    st.played += 1;
    st.totalCorrect += s;
    st.dist[s] = (st.dist[s] || 0) + 1;
    if (s === CONFIG.ROUNDS) st.perfect += 1;
    if (pass) st.passes += 1;
    st.readsCorrect += game.readsCorrect;
    st.readsTotal += game.readsTotal;
    for (const k in game.readsByKey) {
      if (!st.readsByKey[k]) st.readsByKey[k] = { c: 0, t: 0 };
      st.readsByKey[k].c += game.readsByKey[k].c;
      st.readsByKey[k].t += game.readsByKey[k].t;
    }
    st.history[game.number] = s;

    if (pass) {
      if (st.lastNumber === game.number - 1) st.currentStreak += 1;
      else st.currentStreak = 1;
    } else {
      st.currentStreak = 0;
    }
    if (st.currentStreak > st.maxStreak) st.maxStreak = st.currentStreak;
    st.lastNumber = game.number;
    saveStats();
  }

  function recordSurvival() {
    survival.games += 1;
    const f = surFlavor();
    const s = score();
    let isNew = false;
    if (s > (survival.best[f] || 0)) {
      survival.best[f] = s;
      isNew = true;
    }
    Store.set(KEYS.survival, survival);
    return isNew;
  }

  function saveDaily() {
    Store.set(KEYS.daily(game.number, game.hard), {
      round: game.round,
      results: game.results,
      finished: game.finished,
      readsCorrect: game.readsCorrect,
      readsTotal: game.readsTotal,
      readsByKey: game.readsByKey,
    });
  }

  // one-time backfill of stats history from per-day saves
  function backfillHistory() {
    try {
      const re = /^candle\.daily(\.hard)?\.v2\.(\d+)$/;
      let dirty = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const m = key && key.match(re);
        if (!m) continue;
        const data = Store.get(key, null);
        if (!data || !data.finished || !Array.isArray(data.results)) continue;
        const n = clampInt(m[2], 1, 1e6);
        const st = m[1] ? stats.hard : stats.normal;
        if (st.history[n] == null) {
          st.history[n] = data.results.filter(Boolean).length;
          dirty = true;
        }
      }
      if (dirty) saveStats();
    } catch {
      /* ignore */
    }
  }

  /* ---------------- Badges ---------------- */
  function badgeEarned(id) {
    return !!badgeStore.earned[id];
  }
  function earnBadge(id) {
    if (badgeEarned(id)) return;
    badgeStore.earned[id] = puzzleNumberFor(new Date());
    Store.set(KEYS.badges, badgeStore);
    newBadgesQueue.push(id);
  }
  function evaluateBadges() {
    const anyBest = Math.max(...Object.values(survival.best));
    const both = [stats.normal, stats.hard];
    if (both.some((s) => s.passes >= 1)) earnBadge("first_win");
    if (both.some((s) => (s.dist[6] || 0) >= 1)) earnBadge("perfect");
    if (both.some((s) => s.maxStreak >= 7)) earnBadge("streak7");
    if (both.some((s) => s.maxStreak >= 30)) earnBadge("streak30");
    if (stats.hard.passes >= 1) earnBadge("hard");
    if (anyBest >= 20) earnBadge("survivor");
    if ([1, 2, 3, 4, 5, 6].every((l) => badgeStore.levelsDone.includes(l))) earnBadge("scholar");
    if (academy.done.length >= MISSIONS.length) earnBadge("grad");
    if (
      game &&
      game.mode === "daily" &&
      game.hard &&
      game.finished &&
      game.readsTotal >= 24 &&
      game.readsCorrect / game.readsTotal >= 0.9
    )
      earnBadge("reads90");
    if (game && game.mode === "practice" && game.blitz && game.finished && score() >= CONFIG.PASS) earnBadge("blitz");
  }
  function renderBadges() {
    const wrap = $("#badges");
    wrap.innerHTML = "";
    for (const b of BADGES) {
      const el = document.createElement("div");
      el.className = "badge " + (badgeEarned(b.id) ? "earned" : "locked");
      el.title = t("b_" + b.id + "_d");
      const ic = document.createElement("span");
      ic.className = "b-icon";
      ic.textContent = b.icon;
      el.appendChild(ic);
      el.appendChild(document.createTextNode(t("b_" + b.id + "_n")));
      wrap.appendChild(el);
    }
  }

  /* ---------------- Equity curve ---------------- */
  function renderEquity() {
    if (!game.finished || game.round === 0) {
      dom.equity.hidden = true;
      return;
    }
    const you = [0],
      hold = [0];
    for (let i = 0; i < game.round; i++) {
      const k = game.series[VIS_START + CONFIG.HISTORY + i];
      const ret = (k.close - k.open) / k.open;
      you.push(you[i] + (game.results[i] ? 1 : -1) * 100 * Math.abs(ret));
      hold.push(hold[i] + 100 * ret);
    }
    const pFin = Math.round(you[you.length - 1]);
    const hFin = Math.round(hold[hold.length - 1]);

    dom.equityCap.innerHTML = "";
    dom.equityCap.appendChild(document.createTextNode(t("eq_stake") + " "));
    const sp1 = document.createElement("strong");
    sp1.className = "eq-you";
    sp1.textContent = `${t("eq_you")} ${pFin >= 0 ? "+" : ""}${pFin}`;
    dom.equityCap.appendChild(sp1);
    dom.equityCap.appendChild(document.createTextNode(" · "));
    const sp2 = document.createElement("strong");
    sp2.className = "eq-hold";
    sp2.textContent = `${t("eq_hold")} ${hFin >= 0 ? "+" : ""}${hFin}`;
    dom.equityCap.appendChild(sp2);

    const c = dom.equitySvg;
    while (c.firstChild) c.removeChild(c.firstChild);
    const W = 360,
      H = 96,
      padL = 8,
      padR = 8,
      padT = 10,
      padB = 10;
    c.setAttribute("viewBox", `0 0 ${W} ${H}`);
    let mn = 0,
      mx = 0;
    for (const arr of [you, hold])
      for (const v of arr) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    if (mx === mn) mx = mn + 1;
    const xOf = (i) => padL + (i / (you.length - 1)) * (W - padL - padR);
    const yOf = (v) => padT + (1 - (v - mn) / (mx - mn)) * (H - padT - padB);
    svg("line", { class: "eq-zero", x1: padL, y1: yOf(0), x2: W - padR, y2: yOf(0) }, c);
    const mk = (arr, cls) =>
      svg("polyline", { class: cls, points: arr.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ") }, c);
    mk(hold, "eq-line-hold");
    mk(you, "eq-line-you");
    dom.equity.hidden = false;
  }

  /* ---------------- Result modal ---------------- */
  function readsPct(correct, total) {
    return total ? Math.round((correct / total) * 100) : 0;
  }

  function openResult(announceIt, surNewRecord) {
    const s = score();
    const marks =
      (game.hard ? ' <span class="hard-badge">HARD</span>' : "") +
      (game.blitz ? ' <span class="hard-badge" style="color:var(--accent)">⚡</span>' : "");
    dom.resultTitle.innerHTML = t("res_title") + marks;

    if (game.mode === "survival") {
      dom.resultHeadline.textContent =
        t("sur_over", { n: game.round }) + (surNewRecord ? " " + t("sur_new_record") : "");
      dom.resultScore.textContent = String(s);
      dom.resultGrid.textContent = `🟩×${s}  🟥×${CONFIG.SUR_LIVES - game.lives}`;
    } else if (game.mode === "academy") {
      dom.resultHeadline.textContent = game.missionPassed ? t("mis_passed") : t("mis_failed");
      dom.resultScore.textContent = `${s} / ${CONFIG.ROUNDS}`;
      dom.resultGrid.textContent = game.results.map((r) => (r ? "🟩" : "🟥")).join("");
    } else {
      dom.resultHeadline.textContent = t("headline_" + s);
      dom.resultScore.textContent = `${s} / ${CONFIG.ROUNDS}`;
      dom.resultGrid.textContent = game.results.map((r) => (r ? "🟩" : "🟥")).join("");
    }

    // real-market reveal
    if (game.real && game.finished) {
      dom.realReveal.textContent = t("real_reveal", { sym: game.real.sym, from: game.real.from, to: game.real.to });
      dom.realReveal.hidden = false;
    } else {
      dom.realReveal.hidden = true;
    }

    dom.resultMini.innerHTML = "";
    const st = bucketStats();
    let minis;
    if (game.mode === "daily") {
      minis = [
        [t("mini_streak"), st.currentStreak],
        [t("mini_max"), st.maxStreak],
        [t("mini_win"), winRate(st)],
      ];
    } else if (game.mode === "survival") {
      minis = [
        [t("mini_rounds"), game.round],
        [t("mini_hits"), s],
        [t("mini_best"), survival.best[surFlavor()] || 0],
      ];
    } else if (game.mode === "academy") {
      minis = [
        [t("mini_mode"), t(game.mission.id + "_t")],
        [t("mini_best"), t("academy_progress", { a: academy.done.length, b: MISSIONS.length })],
      ];
    } else {
      minis = [[t("mini_mode"), t("mini_practice")]];
    }
    if (game.hard && game.readsTotal > 0) minis.push([t("mini_reads"), readsPct(game.readsCorrect, game.readsTotal)]);
    for (const [label, val] of minis) {
      const div = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = String(val);
      div.appendChild(strong);
      div.appendChild(document.createTextNode(label));
      dom.resultMini.appendChild(div);
    }

    // new badges
    if (newBadgesQueue.length) {
      const names = newBadgesQueue.map((id) => {
        const b = BADGES.find((x) => x.id === id);
        return (b ? b.icon + " " : "") + t("b_" + id + "_n");
      });
      dom.newBadges.textContent = `${t("new_badge")} ${names.join(", ")}`;
      dom.newBadges.hidden = false;
      newBadgesQueue = [];
    } else {
      dom.newBadges.hidden = true;
    }

    renderEquity();

    if (game.mode === "daily") {
      const bank = LESSONS[prefs.lang] || LESSONS.en;
      const idx = ((game.number % bank.length) + bank.length) % bank.length;
      dom.lessonName.textContent = bank[idx][0];
      dom.lessonBody.textContent = bank[idx][1];
      dom.lesson.hidden = false;
    } else {
      dom.lesson.hidden = true;
    }

    if (game.mode === "survival") dom.btnPracticeRes.textContent = t("res_again");
    else if (game.mode === "academy") {
      const idx = missionIndex(game.mission);
      dom.btnPracticeRes.textContent =
        game.missionPassed && idx + 1 < MISSIONS.length ? t("mis_next") : t("res_again");
    } else dom.btnPracticeRes.textContent = t("res_practice");

    // cross-sell the other daily variant (normal <-> HARD)
    const otherBtn = $("#btn-other-daily");
    if (game.mode === "daily") {
      const other = Store.get(KEYS.daily(game.number, !game.hard), null);
      if (!other || !other.finished) {
        otherBtn.textContent = t(game.hard ? "other_daily_norm" : "other_daily_hard");
        otherBtn.hidden = false;
      } else {
        otherBtn.hidden = true;
      }
    } else {
      otherBtn.hidden = true;
    }
    dom.sharePreview.hidden = true;

    startCountdown();
    showModal(dom.result);
    if (announceIt) announce(game.mode === "survival" ? t("sur_over", { n: game.round }) : `${s} / ${CONFIG.ROUNDS}`);
  }

  function winRate(st) {
    return st.played ? Math.round((st.passes / st.played) * 100) : 0;
  }

  /* ---------------- Sharing (text) ---------------- */
  function shareLabel() {
    const hard = game.hard ? " HARD" : "";
    const blitz = game.blitz ? " ⚡" : "";
    if (game.mode === "daily") return `CANDLE${hard} #${game.number}`;
    if (game.mode === "survival") return `CANDLE SURVIVAL${hard}${blitz}`;
    if (game.mode === "academy") return `CANDLE ACADEMY M${game.number}`;
    if (game.real) return `CANDLE${hard}${blitz} 🌍 ${game.real.sym}`;
    return `CANDLE${hard}${blitz} practice·L${prefs.practiceLevel}`;
  }
  function shareText() {
    const s = score();
    const reads = game.hard && game.readsTotal ? ` · 🎯${readsPct(game.readsCorrect, game.readsTotal)}%` : "";
    const url = shareUrl();
    if (game.mode === "survival") {
      return `${shareLabel()}  ${s} 🟩 / ${game.round} ${t("sur_rounds_word")}${reads}${url ? "\n" + url : ""}`;
    }
    const grid = game.results.map((r) => (r ? "🟩" : "🟥")).join("");
    return `${shareLabel()}  ${s}/${CONFIG.ROUNDS}${reads}\n${grid}${url ? "\n" + url : ""}`;
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
        /* cancelled */
      }
    }
    const ok = await copyToClipboard(text);
    flashBtn($("#btn-share"), ok ? "share_copied" : "share_failed");
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

  function flashBtn(btn, key) {
    const original = btn.textContent;
    btn.textContent = t(key);
    announce(btn.textContent);
    window.setTimeout(() => (btn.textContent = original), 2200);
  }

  /* ---------------- Share image (canvas PNG) ---------------- */
  const IMG = {
    bg: "#0b0f17",
    panel: "#111827",
    line: "#1f2937",
    text: "#e6edf3",
    dim: "#9aa7b8",
    faint: "#5b6678",
    bull: "#16c784",
    bear: "#ea3943",
    accent: "#4f8cff",
    hard: "#ff7a45",
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buildShareCanvas() {
    const W = 1080,
      H = 1080;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");

    ctx.fillStyle = IMG.bg;
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(W / 2, -200, 100, W / 2, -200, 900);
    grad.addColorStop(0, "#16213a");
    grad.addColorStop(1, "rgba(11,15,23,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = IMG.text;
    ctx.font = "800 64px -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CANDLE", 64, 110);
    let bx = 330;
    if (game.hard) {
      ctx.fillStyle = IMG.hard;
      rr(ctx, bx, 60, 150, 60, 14);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 36px ui-monospace, Consolas, monospace";
      ctx.fillText("HARD", bx + 28, 102);
      bx += 166;
    }
    if (game.blitz) {
      ctx.fillStyle = IMG.accent;
      rr(ctx, bx, 60, 80, 60, 14);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 36px ui-monospace, Consolas, monospace";
      ctx.fillText("⚡", bx + 22, 104);
    }
    ctx.fillStyle = IMG.dim;
    ctx.font = "600 36px ui-monospace, Consolas, monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      game.mode === "daily"
        ? `#${game.number}`
        : game.mode === "survival"
        ? "SURVIVAL"
        : game.mode === "academy"
        ? `ACADEMY M${game.number}`
        : game.real
        ? `REAL · ${game.real.sym.split("/")[0]}`
        : `practice L${prefs.practiceLevel}`,
      W - 64,
      104
    );

    // chart panel
    const cx = 64,
      cy = 170,
      cw = W - 128,
      ch = 420;
    ctx.fillStyle = IMG.panel;
    rr(ctx, cx, cy, cw, ch, 24);
    ctx.fill();
    ctx.strokeStyle = IMG.line;
    ctx.lineWidth = 2;
    rr(ctx, cx, cy, cw, ch, 24);
    ctx.stroke();

    const padL = 30,
      padR = 30,
      padT = 30,
      padB = 30;
    const plotX = cx + padL,
      plotY = cy + padT,
      plotW = cw - padL - padR,
      plotH = ch - padT - padB;
    const w = viewWin();
    const series = game.series.slice(w.winStart, w.winStart + w.nShow);
    let min = Infinity,
      max = -Infinity;
    for (const k of series) {
      if (k.low < min) min = k.low;
      if (k.high > max) max = k.high;
    }
    const span = max - min || 1;
    min -= span * 0.06;
    max += span * 0.06;
    const yOf = (p) => plotY + (1 - (p - min) / (max - min)) * plotH;
    const slot = plotW / Math.max(series.length, 1);

    if (w.divSlot != null) {
      const dx = plotX + slot * w.divSlot;
      ctx.strokeStyle = IMG.faint;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(dx, plotY);
      ctx.lineTo(dx, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = IMG.faint;
      ctx.font = "600 20px ui-monospace, Consolas, monospace";
      ctx.textAlign = "left";
      ctx.fillText("LIVE", dx + 8, plotY + 26);
    }

    const bodyW = Math.max(6, slot * 0.55);
    series.forEach((k, v) => {
      const x = plotX + slot * (v + 0.5);
      ctx.strokeStyle = k.bull ? IMG.bull : IMG.bear;
      ctx.fillStyle = k.bull ? IMG.bull : IMG.bear;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, yOf(k.high));
      ctx.lineTo(x, yOf(k.low));
      ctx.stroke();
      const yT = yOf(Math.max(k.open, k.close));
      const yB = yOf(Math.min(k.open, k.close));
      rr(ctx, x - bodyW / 2, yT, bodyW, Math.max(3, yB - yT), 3);
      ctx.fill();
    });

    // score
    ctx.fillStyle = IMG.text;
    ctx.font = "800 140px -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    if (game.mode === "survival") {
      ctx.fillText(String(score()), W / 2, 750);
      ctx.fillStyle = IMG.dim;
      ctx.font = "600 38px -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(t("png_rounds", { r: game.round }), W / 2, 812);
    } else {
      ctx.fillText(`${score()}/${CONFIG.ROUNDS}`, W / 2, 750);
      ctx.fillStyle = IMG.dim;
      ctx.font = "600 38px -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(t("headline_" + score()).replace(/[🏆📈✅📉]/gu, "").trim(), W / 2, 812);
    }

    if (game.hard && game.readsTotal > 0) {
      ctx.fillStyle = IMG.hard;
      ctx.font = "700 32px ui-monospace, Consolas, monospace";
      ctx.fillText(`🎯 ${readsPct(game.readsCorrect, game.readsTotal)}%`, W / 2, 862);
    }

    if (game.mode === "survival") {
      ctx.fillStyle = IMG.text;
      ctx.font = "700 44px -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(`🟩 ×${score()}   🟥 ×${CONFIG.SUR_LIVES - game.lives}`, W / 2, 940);
    } else {
      const sq = 74,
        gap2 = 18;
      const totalW = CONFIG.ROUNDS * sq + (CONFIG.ROUNDS - 1) * gap2;
      let sx = (W - totalW) / 2;
      for (const r of game.results) {
        ctx.fillStyle = r ? IMG.bull : IMG.bear;
        rr(ctx, sx, 884, sq, sq, 16);
        ctx.fill();
        sx += sq + gap2;
      }
    }

    // earned badges
    const icons = BADGES.filter((b) => badgeEarned(b.id)).map((b) => b.icon).slice(0, 8);
    if (icons.length) {
      ctx.font = "34px serif";
      ctx.fillStyle = IMG.text;
      ctx.fillText(icons.join(" "), W / 2, 1000);
    }

    ctx.fillStyle = IMG.faint;
    ctx.font = "600 30px ui-monospace, Consolas, monospace";
    ctx.fillText("candles.gamestheory.org", W / 2, 1044);

    return cv;
  }

  function doShareImage() {
    if (!game) return;
    let cv;
    try {
      cv = buildShareCanvas();
    } catch {
      flashBtn($("#btn-share-img"), "img_failed");
      return;
    }
    const name = `candle-${game.mode === "daily" ? game.number : game.mode}${game.hard ? "-hard" : ""}.png`;
    cv.toBlob(async (blob) => {
      if (!blob) {
        flashBtn($("#btn-share-img"), "img_failed");
        return;
      }
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: shareText() });
          return;
        } catch {
          /* cancelled */
        }
      }
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = previewURL;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      dom.sharePreview.src = previewURL;
      dom.sharePreview.hidden = false;
      flashBtn($("#btn-share-img"), "img_saved");
    }, "image/png");
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
  function renderHeatmap(st) {
    const wrap = $("#heatmap");
    wrap.innerHTML = "";
    const today = startOfDay(new Date());
    const todayN = puzzleNumberFor(today);
    const DAYS = 84;
    const start = new Date(today);
    start.setDate(start.getDate() - (DAYS - 1));
    // align to Monday
    const offset = (start.getDay() + 6) % 7;
    let col = document.createElement("div");
    col.className = "heat-col";
    for (let b = 0; b < offset; b++) {
      const cell = document.createElement("div");
      cell.className = "heat-cell";
      cell.style.visibility = "hidden";
      col.appendChild(cell);
    }
    let slots = offset;
    for (let d = 0; d < DAYS; d++) {
      if (slots === 7) {
        wrap.appendChild(col);
        col = document.createElement("div");
        col.className = "heat-col";
        slots = 0;
      }
      const day = new Date(start);
      day.setDate(day.getDate() + d);
      const n = puzzleNumberFor(day);
      const sc = st.history[n];
      const cell = document.createElement("div");
      let cls = "heat-cell";
      if (sc != null) {
        if (sc >= 6) cls += " w1";
        else if (sc >= 4) cls += " w0";
        else if (sc >= 2) cls += " l0";
        else cls += " l1";
      }
      if (n === todayN) cls += " today";
      cell.className = cls;
      cell.title = `${day.toLocaleDateString(prefs.lang === "pl" ? "pl-PL" : "en-US")}: ${sc != null ? sc + "/6" : "—"}`;
      col.appendChild(cell);
      slots++;
    }
    wrap.appendChild(col);
  }

  function renderIndAcc(st) {
    const box = $("#ind-acc");
    const list = $("#ind-acc-list");
    const tip = $("#acc-tip");
    const entries = ALL_INDS.filter((k) => st.readsByKey[k] && st.readsByKey[k].t > 0);
    if (statsView !== "hard" || entries.length === 0) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    list.innerHTML = "";
    let weakest = null;
    for (const k of entries) {
      const e = st.readsByKey[k];
      const pct = Math.round((e.c / e.t) * 100);
      const row = document.createElement("div");
      row.className = "acc-row" + (pct >= 75 ? " strong" : "");
      const name = document.createElement("span");
      name.className = "acc-name";
      name.textContent = t("ind_name_" + k);
      const bar = document.createElement("div");
      bar.className = "acc-bar";
      const fill = document.createElement("div");
      fill.className = "acc-fill";
      fill.style.width = pct + "%";
      bar.appendChild(fill);
      const val = document.createElement("span");
      val.className = "acc-val";
      val.textContent = `${pct}% (${e.t})`;
      row.appendChild(name);
      row.appendChild(bar);
      row.appendChild(val);
      list.appendChild(row);
      if (e.t >= 4 && (!weakest || e.c / e.t < weakest.pct)) weakest = { k, pct: e.c / e.t, row };
    }
    if (weakest) {
      weakest.row.classList.add("weak");
      weakest.row.classList.remove("strong");
      const bank = LESSONS[prefs.lang] || LESSONS.en;
      const li = LESSON_FOR_KEY[weakest.k];
      if (li != null && bank[li]) {
        $("#acc-tip-eyebrow").textContent = t("acc_weak_tip", { name: t("ind_name_" + weakest.k) });
        $("#acc-tip-name").textContent = bank[li][0];
        $("#acc-tip-body").textContent = bank[li][1];
        tip.hidden = false;
      } else {
        tip.hidden = true;
      }
    } else {
      tip.hidden = true;
    }
  }

  function renderStats() {
    const st = statsView === "hard" ? stats.hard : stats.normal;
    $("#st-tab-normal").setAttribute("aria-selected", String(statsView === "normal"));
    $("#st-tab-hard").setAttribute("aria-selected", String(statsView === "hard"));
    $("#st-played").textContent = st.played;
    $("#st-winrate").textContent = winRate(st);
    $("#st-streak").textContent = st.currentStreak;
    $("#st-maxstreak").textContent = st.maxStreak;

    const reads = $("#st-reads");
    if (statsView === "hard" && st.readsTotal > 0) {
      reads.innerHTML = t("st_reads", { pct: `<strong>${readsPct(st.readsCorrect, st.readsTotal)}</strong>` });
      reads.hidden = false;
    } else {
      reads.hidden = true;
    }

    renderIndAcc(st);

    const wrap = $("#dist");
    wrap.innerHTML = "";
    const maxCount = Math.max(1, ...st.dist);
    const todayScore =
      game && game.mode === "daily" && game.finished && (game.hard ? "hard" : "normal") === statsView ? score() : -1;
    for (let i = CONFIG.ROUNDS; i >= 0; i--) {
      const count = st.dist[i] || 0;
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

    renderHeatmap(st);
    renderBadges();

    const sb = $("#sur-best");
    sb.textContent = t("sur_best_line", {
      a: survival.best.norm || 0,
      b: survival.best.hard || 0,
      c: survival.best["norm-blitz"] || 0,
      d: survival.best["hard-blitz"] || 0,
    });
    sb.hidden = false;
  }

  /* ---------------- Export / import ---------------- */
  function doExport() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("candle.")) data[k] = localStorage.getItem(k);
      }
    } catch {
      /* ignore */
    }
    const payload = { app: "candle", v: 1, exported: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    a.href = url;
    a.download = `candle-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    flashBtn($("#btn-export"), "exp_done");
  }

  function doImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        if (!payload || payload.app !== "candle" || !payload.data || typeof payload.data !== "object") {
          flashBtn($("#btn-import"), "imp_fail");
          return;
        }
        if (!window.confirm(t("imp_confirm"))) return;
        for (const k in payload.data) {
          if (k.startsWith("candle.") && typeof payload.data[k] === "string") {
            try {
              JSON.parse(payload.data[k]); // must be valid JSON
              localStorage.setItem(k, payload.data[k]);
            } catch {
              /* skip invalid entries */
            }
          }
        }
        location.reload();
      } catch {
        flashBtn($("#btn-import"), "imp_fail");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- Modal helpers ---------------- */
  function showModal(dlg) {
    closeAllModals();
    if (typeof dlg.showModal === "function") {
      try {
        dlg.showModal();
        return;
      } catch {
        /* already open */
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
    $("#btn-sound").setAttribute("aria-pressed", String(prefs.sound));
  }
  function applyLang() {
    document.documentElement.lang = prefs.lang;
    $("#btn-lang").textContent = prefs.lang.toUpperCase();
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    dom.helpBody.innerHTML = t("help_html");
    if (game) {
      updateMetaTitle();
      renderScore();
      renderAnalysis();
      renderReads();
      if (dom.result.open) openResult(false);
      if (dom.stats.open) renderStats();
    }
  }
  function savePrefs() {
    Store.set(KEYS.prefs, prefs);
  }

  function restartCurrentMode() {
    if (!game) return startDaily();
    if (game.mode === "daily") startDaily();
    else if (game.mode === "survival") startSurvival();
    else startPractice();
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
    dom.tabSurvival.addEventListener("click", () => {
      if (!academyListOpen && game && game.mode === "survival" && !game.finished) return;
      startSurvival();
    });
    dom.tabAcademy.addEventListener("click", () => showAcademyList());
    $("#mb-back").addEventListener("click", () => showAcademyList());
    dom.btnNewChart.addEventListener("click", () => {
      if (game && game.mode === "survival") startSurvival();
      else startPractice();
    });
    dom.btnReal.addEventListener("click", () => {
      prefs.real = !prefs.real;
      savePrefs();
      startPractice();
    });

    dom.btnHard.addEventListener("click", () => {
      prefs.hard = !prefs.hard;
      savePrefs();
      restartCurrentMode();
    });
    dom.btnBlitz.addEventListener("click", () => {
      prefs.blitz = !prefs.blitz;
      savePrefs();
      if (game && game.mode !== "daily") restartCurrentMode();
      else renderModeBars();
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
      delete hardReads[k];
      renderModeBars();
      renderCharts();
      renderReads();
      updateCallGate();
    });

    $("#btn-help").addEventListener("click", () => showModal(dom.help));
    $("#btn-how-footer").addEventListener("click", () => showModal(dom.help));
    $("#btn-stats").addEventListener("click", () => {
      statsView = prefs.hard ? "hard" : "normal";
      renderStats();
      showModal(dom.stats);
    });
    $("#st-tab-normal").addEventListener("click", () => {
      statsView = "normal";
      renderStats();
    });
    $("#st-tab-hard").addEventListener("click", () => {
      statsView = "hard";
      renderStats();
    });

    $("#btn-export").addEventListener("click", doExport);
    $("#btn-import").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) doImport(f);
      e.target.value = "";
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
    $("#btn-share-img").addEventListener("click", doShareImage);
    $("#btn-other-daily").addEventListener("click", () => {
      prefs.hard = !prefs.hard;
      savePrefs();
      closeAllModals();
      startDaily();
    });
    dom.btnPracticeRes.addEventListener("click", () => {
      if (game && game.mode === "survival") startSurvival();
      else if (game && game.mode === "academy") {
        const idx = missionIndex(game.mission);
        if (game.missionPassed && idx + 1 < MISSIONS.length) startMission(MISSIONS[idx + 1]);
        else startMission(game.mission);
      } else startPractice();
    });

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
      } else if (!dom.reads.hidden && !busy && game && !game.finished) {
        // HARD keyboard tagging: 1=▲ 2=• 3=▼, Tab handled natively
        if (k === "1") {
          e.preventDefault();
          tagCursorRead(1);
        } else if (k === "2") {
          e.preventDefault();
          tagCursorRead(0);
        } else if (k === "3") {
          e.preventDefault();
          tagCursorRead(-1);
        }
      }
    });

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
      stopTimer();
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
    backfillHistory();
    const ver = $("#app-version");
    if (ver) ver.textContent = APP_VERSION;
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
