/*
 * @coinsori-strategy v1
 * name: EMA9/EMA21 Crossover Trend
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * Simple EMA crossover trend-follower. Buys when fast EMA crosses above slow EMA,
 * sells when it crosses back below. No extra filters — just the crossover signal.
 * Works best in trending markets; loses in choppy/ranging conditions.
 */

function onUpdate(ctx) {
    // Need at least 21 bars for EMA21 to be valid
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    if (emaFast == null || emaSlow == null) return null;

    // Previous bar values for crossover detection
    const emaFastPrev = ctx.ema(9, 1);
    const emaSlowPrev = ctx.ema(21, 1);
    if (emaFastPrev == null || emaSlowPrev == null) return null;

    // No position — look for buy signal
    if (ctx.position === 0) {
        // EMA9 crosses ABOVE EMA21 → BUY
        if (emaFastPrev <= emaSlowPrev && emaFast > emaSlow) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Have position — look for sell signal
        // EMA9 crosses BELOW EMA21 → SELL
        if (emaFastPrev >= emaSlowPrev && emaFast < emaSlow) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
