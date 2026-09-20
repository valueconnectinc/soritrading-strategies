/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter + ATR Trail
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following strategy using EMA9/21 crossover with RSI filter and ATR
 * trailing stop. Designed to participate in SOL's trending moves without
 * getting stopped out by normal pullbacks.
 * Buys when: EMA9 crosses above EMA21 AND RSI < 70 (not overbought)
 * Sells when: EMA9 crosses below EMA21 OR 4x ATR trailing stop hit
 * Does NOT work: in tight ranges — RSI filter prevents entries but also
 * prevents catching the start of trends when RSI is already elevated.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);
    const price = ctx.price;

    // Warm-up
    if (ema9 == null || ema21 == null || rsi == null || atr == null) return null;

    const pos = ctx.position;

    // === ENTRY ===
    if (pos === 0) {
        const ema9Prev  = ctx.ema(9,  1);
        const ema21Prev = ctx.ema(21, 1);
        const rsiPrev   = ctx.rsi(14, 1);
        if (ema9Prev == null || ema21Prev == null || rsiPrev == null) return null;

        // EMA9 crosses above EMA21 (bullish crossover)
        const bullishCross = ema9Prev <= ema21Prev && ema9 > ema21;
        // RSI not overbought — avoid buying at top
        const rsiOk = rsi < 70;

        if (bullishCross && rsiOk) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // === EXIT ===
    if (pos > 0) {
        const ema9Prev  = ctx.ema(9,  1);
        const ema21Prev = ctx.ema(21, 1);
        if (ema9Prev == null || ema21Prev == null) return null;

        // EMA9 crosses below EMA21 (bearish crossover) — exit signal
        if (ema9Prev > ema21Prev && ema9 <= ema21) {
            return { side: 'sell', qty: pos };
        }

        // Trailing stop: 4x ATR from highest price since entry
        const entryPx  = ctx.entryPx;
        const highPrev  = ctx.high(1); // previous bar's high
        const trailDist = atr * 4;
        const trailStop = highPrev - trailDist;

        if (price < trailStop) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
