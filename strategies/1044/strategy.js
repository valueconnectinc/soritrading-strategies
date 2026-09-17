/*
 * @coinsori-strategy v1
 * name: Wide ATR EMA Trend Daily v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * EMA(9,21) golden/death cross trend-following with WIDE ATR(14) trailing
 * stop (3× ATR) to let winners run, and RSI momentum filter. Previous version
 * (1.5× ATR) was too tight — it returned +8.33% but only traded 2-6 times over
 * 180-500 days, exiting winners too early. This version widens the stop to 3×
 * and removes the volume filter to allow more trades.
 *
 * When it buys: EMA9 crosses above EMA21, price above EMA50, RSI > 50.
 * When it sells: EMA9 crosses below EMA21, or price falls > 3× ATR below high.
 * Does NOT work: Choppy markets with frequent EMA crosses — each cross is a
 * trade and fees compound. Best in sustained trending periods.
 */
function onUpdate(ctx) {
    // ── Warm-up: need 50 bars for EMA50 ───────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema50 = ctx.ema(50);
    if (ema9 == null || ema21 == null || ema50 == null) return null;

    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // ── Indicators ─────────────────────────────────────────────────────────
    const rsi  = ctx.rsi(14);
    if (rsi == null) return null;

    const atr  = ctx.atr(14);
    if (atr == null) return null;

    // ── Cross detection ──────────────────────────────────────────────────────
    const bullish  = ema9  > ema21;
    const wasBull  = ema9_1 > ema21_1;
    const crossUp   = !wasBull && bullish;
    const crossDown = wasBull && !bullish;

    // ── State: trailing high for ATR stop ───────────────────────────────────
    const s = ctx.state;
    if (ctx.position === 0) {
        s.highPx  = null;
        s.entryPx = null;
    }
    if (ctx.position > 0) {
        s.highPx = Math.max(s.highPx ?? ctx.price, ctx.price);
    }
    const highPx = s.highPx;

    // ════════════════════════════════════════════════════════════════════════
    // ENTRY — long
    //   1. Flat position
    //   2. EMA9 just crossed above EMA21 (golden cross)
    //   3. Price above EMA50 (confirmed uptrend)
    //   4. RSI > 50 (momentum confirmed)
    // ════════════════════════════════════════════════════════════════════════
    if (ctx.position === 0) {
        if (crossUp && ctx.price > ema50 && rsi > 50) {
            s.entryPx = ctx.price;
            s.highPx  = ctx.price;
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // EXIT — WIDE ATR trailing stop (3× ATR below high) + death cross
    //   3× ATR on daily BTC = ~3 × 2000 = $6000 buffer — large enough to
    //   absorb normal daily swings without being stopped out prematurely.
    // ════════════════════════════════════════════════════════════════════════
    if (ctx.position > 0 && highPx != null) {
        const stopPx = highPx - 3 * atr;
        if (ctx.price < stopPx || crossDown) {
            s.highPx  = null;
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
