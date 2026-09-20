/*
 * @coinsori-strategy v1
 * name: Dual-Regime EMA + RSI Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Dual-regime strategy that adapts to market conditions:
 * - BULL regime (price > EMA200): trend-following with EMA9/21 crossover + RSI filter
 * - BEAR regime (price < EMA200): mean reversion with RSI oversold bounces
 * This avoids sitting in cash during bear windows (previous version's failure).
 * Exit: EMA9/21 crossover reversal OR 2.5x ATR stop
 * Does NOT work: in tight chop — both modes generate whipsaws with no clear trend.
 */
function onUpdate(ctx) {
    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const price  = ctx.price;

    if (ema9 == null || ema21 == null || ema200 == null || rsi == null || atr == null) return null;

    const pos = ctx.position;

    // === ENTRY ===
    if (pos === 0) {
        const ema9Prev  = ctx.ema(9,  1);
        const ema21Prev = ctx.ema(21, 1);
        const rsiPrev   = ctx.rsi(14, 1);
        if (ema9Prev == null || ema21Prev == null || rsiPrev == null) return null;

        const bullRegime = price > ema200;

        if (bullRegime) {
            // BULL: trend-following — EMA9 crosses above EMA21, RSI not overbought
            const bullishCross = ema9Prev <= ema21Prev && ema9 > ema21;
            if (bullishCross && rsi < 70) {
                return { side: 'buy', qty: ctx.cash / price * 0.99 };
            }
        } else {
            // BEAR: mean reversion — RSI bounces from oversold (< 35)
            const rsiBounce = rsiPrev < 35 && rsi >= 35;
            if (rsiBounce) {
                return { side: 'buy', qty: ctx.cash / price * 0.99 };
            }
        }
    }

    // === EXIT ===
    if (pos > 0) {
        const ema9Prev  = ctx.ema(9,  1);
        const ema21Prev = ctx.ema(21, 1);
        if (ema9Prev == null || ema21Prev == null) return null;

        // EMA9/21 crossover reversal — exit either direction
        if (ema9Prev > ema21Prev && ema9 <= ema21) {
            return { side: 'sell', qty: pos };
        }
        if (ema9Prev <= ema21Prev && ema9 > ema21) {
            return { side: 'sell', qty: pos };
        }

        // ATR stop — 2.5x ATR from highest price since entry
        const highPrev   = ctx.high(1);
        const trailStop  = highPrev - atr * 2.5;
        if (price < trailStop) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
