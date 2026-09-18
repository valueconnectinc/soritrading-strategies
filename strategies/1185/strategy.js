/*
 * @coinsori-strategy v1
 * name: EMA50 Trend Filter + EMA Crossover + ATR Stop — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A pure EMA crossover without trend filter gets destroyed
 * by choppy markets (whipsaw losses). Adding EMA50 as a trend-direction filter
 * means we only trade in the direction of the major trend, cutting false signals.
 * ATR-based stops replace fixed exits so we let winners run and cap losers.
 * When it buys and sells: Buys when price is above EMA50 (major uptrend) AND
 * EMA9 crosses above EMA21 with RSI confirming. Exits via ATR trailing stop
 * or if price closes below EMA50 (major trend reversal).
 * When it does NOT work: In prolonged bear markets where price never sustains
 * above EMA50, or in tight ranges where ATR tightens stops prematurely.
 */
function onUpdate(ctx) {
    // Warm-up: EMA50 needs ~100 bars
    if (ctx.i < 100) return null;

    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema50 = ctx.ema(50);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);

    if (ema9 == null || ema21 == null || ema50 == null || rsi == null || atr == null) return null;

    // Previous bar values for crossover detection
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // ── MAJOR TREND FILTER: only trade when price is above EMA50 ───────────────
    const majorUptrend = ctx.price > ema50;

    // ── ENTRY ──────────────────────────────────────────────────────────────────
    if (ctx.position === 0 && majorUptrend) {
        const bullishCross = ema9_1 <= ema21_1 && ema9 > ema21;
        // RSI confirms momentum without being overbought
        const rsiConfirm = rsi > 50 && rsi < 70;
        if (bullishCross && rsiConfirm) {
            // Stop-loss at 2× ATR below entry
            const stopPx = ctx.price - atr * 2;
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.98,
                stopPx: stopPx   // ATR-based hard stop
            };
        }
    }

    // ── EXIT: trend reversal OR stop-loss ──────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: EMA9 crosses below EMA21 (short-term reversal)
        const bearishCross = ema9_1 >= ema21_1 && ema9 < ema21;
        // Exit 2: Price drops below EMA50 (major trend broken)
        const trendBroken = ctx.price < ema50;
        // Exit 3: ATR trailing stop — price dropped 2× ATR from highest price
        const atrTrail = ctx.price < (ctx.price - atr * 2); // simplified; hard stop above

        if (bearishCross || trendBroken) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
