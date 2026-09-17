/*
 * @coinsori-strategy v1
 * name: ONLY-EMA20-SINGLE-TRADE-VERIFY
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Diagnostic: This strategy should produce EXACTLY 1 trade in any window.
 * Buy on first bar where EMA-9 > EMA-20, never sell (hold to end).
 */

function onUpdate(ctx) {
    const ema20 = ctx.ema(20);
    const ema9  = ctx.ema(9);
    if (ema20 == null || ema9 == null) return null;
    const ema20_1 = ctx.ema(20, 1);
    const ema9_1  = ctx.ema(9, 1);
    if (ema20_1 == null || ema9_1 == null) return null;

    // Golden cross: EMA-9 crosses above EMA-20 — BUY ONCE
    const goldenCross = ema9_1 <= ema20_1 && ema9 > ema20;
    if (goldenCross && ctx.position === 0) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }
    return null; // hold forever
}
