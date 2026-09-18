/*
 * @coinsori-strategy v1
 * name: RSI-2 Mean Reversion + OI Crash v8
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI(2) mean-reversion on 4H BTC — the RSI(2) sensitivity gap is huge.
 * RSI(2) daily hit 11.82% / 3.53% MDD in experiments; RSI(14) 4H only 5.72%.
 * RSI(2) catches micro-oversold bounces that RSI(14) misses entirely.
 * OI crash detection protects against crash regimes (May 2021, Nov 2022)
 * where mean-reversion fails badly. ATR regime filter was REMOVED — it was
 * cutting too many trades short on 4H (v7 had 254 trades at -43.89%).
 * RSI(2) thresholds widened to 15/85 to avoid micro-jiggle whipsaws.
 * When it buys: RSI(2) crosses above 15 in uptrend (price > EMA200),
 * with no OI crash signal.
 * When it sells: OI crash (immediate) OR RSI crosses below 85
 * in downtrend OR ATR stop 3× OR 120-bar timeout.
 * When it does NOT work: slow grinding downtrends where RSI(2) never
 * bounces to 15, and in sharp trending rallies where RSI(2) stays
 * overbought and the stop gets hit repeatedly.
 */

function onUpdate(ctx) {
    const state   = ctx.state ?? {};
    const curBar  = ctx.i;

    if (state.lastBarI !== curBar) {
        state.prevRsi   = state.snapRsi   ?? null;
        state.snapRsi   = ctx.rsi(2);
        state.prevOi    = state.snapOi    ?? null;
        state.snapOi    = ctx.binanceOi();
        state.prevPrice = state.snapPrice ?? null;
        state.snapPrice = ctx.price;
        state.lastBarI  = curBar;
        ctx.state = state;
    }

    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(2);
    const atr    = ctx.atr(14);

    if (ema200 == null || rsi == null || atr == null) return null;

    const price     = ctx.price;
    const pos       = ctx.position;
    const entry     = ctx.entryPx;

    const rsiNow  = state.snapRsi;
    const rsiPrev = state.prevRsi;
    if (rsiNow == null || rsiPrev == null) return null;

    // RSI(2) crossover signals — much wider thresholds than v7 (was 25/75)
    const rsiCrossUp15 = rsiPrev <= 15 && rsiNow > 15;
    const rsiCrossDn85 = rsiPrev >= 85 && rsiNow < 85;

    // OI crash detection — only crash protection (ATR regime REMOVED)
    const oiNow  = state.snapOi;
    const oiPrev = state.prevOi;
    let oiCrash = false;
    if (oiNow != null && oiPrev != null && oiPrev > 0) {
        oiCrash = (oiNow - oiPrev) / oiPrev < -0.15;
    }

    const bullTrend = price > ema200;
    const bearTrend = price < ema200;

    // ── ENTRY: RSI(2) bounce in confirmed uptrend ─────────────────────
    const meanRevBuy = rsiCrossUp15 && bullTrend && !oiCrash;

    if (meanRevBuy && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  RSI2_Bounce  qty=${qty.toFixed(4)}  price=${price}  RSI2=${rsi.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    // ── EXIT 1: OI crash — immediate exit ────────────────────────────
    if (oiCrash && pos > 0) {
        ctx.log(`SELL OI_Crash  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 2: RSI(2) momentum fade in downtrend ────────────────────
    const trendExit = rsiCrossDn85 && bearTrend;

    // ── EXIT 3: ATR stop — fixed 3× width (wider than v7's 1.5×) ─────
    const hardStop = entry > 0 && (entry - price) > atr * 3.0;

    // ── EXIT 4: Very overbought ───────────────────────────────────────
    const veryOverbought = rsi >= 90;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  RSI2=${rsi.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 5: 120-bar timeout ──────────────────────────────────────
    const symState = ctx.symState;
    const entryBar = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 120) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
