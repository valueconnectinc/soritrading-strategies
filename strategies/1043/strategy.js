/*
 * @coinsori-strategy v1
 * name: Tight ATR EMA Trend Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * EMA(9,21) golden/death cross trend-following with tight ATR(14) trailing
 * stop (1.0× = immediate stop, 1.5× = normal stop) and RSI momentum filter.
 * Builds on the promising experiment-244 result but uses a tighter stop to
 * reduce MDD and lock in gains faster.
 *
 * When it buys: EMA9 crosses above EMA21, price above EMA50, RSI > 50.
 * When it sells: EMA9 crosses below EMA21, or ATR stop hit (1.5× below high).
 * Does NOT work: Choppy markets where EMA crosses frequently — each cross
 * triggers a trade and pays fees. Best in clear sustained trends.
 */
function onUpdate(ctx) {
    // ── Warm-up: need 50 bars for EMA50 ───────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema50 = ctx.ema(50);
    if (ema9 == null || ema21 == null || ema50 == null) return null;

    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    const ema50_1 = ctx.ema(50, 1);
    if (ema9_1 == null || ema21_1 == null || ema50_1 == null) return null;

    // ── Indicators ─────────────────────────────────────────────────────────
    const rsi  = ctx.rsi(14);
    const rsi1 = ctx.rsi(14, 1);
    if (rsi == null || rsi1 == null) return null;

    const atr  = ctx.atr(14);
    if (atr == null) return null;

    // ── Volume confirmation: today's volume > 20-day avg ───────────────────
    const avgVol = ctx.avgVol(20);
    const volOk  = avgVol != null && ctx.vol > avgVol * 0.8;

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
    //   5. Volume above 80% of 20-day average
    // ════════════════════════════════════════════════════════════════════════
    if (ctx.position === 0) {
        if (crossUp && ctx.price > ema50 && rsi > 50 && volOk) {
            s.entryPx = ctx.price;
            s.highPx  = ctx.price;
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // EXIT — ATR trailing stop (1.5× ATR below high) + death cross
    // ════════════════════════════════════════════════════════════════════════
    if (ctx.position > 0 && highPx != null) {
        const stopPx = highPx - 1.5 * atr;
        if (ctx.price < stopPx || crossDown) {
            s.highPx  = null;
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
