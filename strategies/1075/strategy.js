/*
 * @coinsori-strategy v1
 * name: EMA-20 Trend No-Stop 1h
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: In strong bull markets, any stop-loss gets hit by normal
 * pullbacks — locking in small losses that compound. This strategy uses a
 * wide 15% stop and rides the EMA-20 trend, exiting only when the trend
 * actually reverses (death cross), not on normal volatility.
 *
 * When it buys and sells: Buy when price crosses above EMA-20 with RSI > 50.
 * Sell only on death cross (EMA-9 crosses below EMA-20) — not on pullbacks.
 * Stop-loss is a safety net at 15% drawdown from entry.
 *
 * When it does NOT work: In bear markets or chop, the death cross exit is
 * slow and the 15% stop takes a big loss. Also underperforms in volatile
 * range-bound markets where the EMA flips repeatedly.
 */

function onUpdate(ctx) {
    const ema20 = ctx.ema(20);
    const ema9  = ctx.ema(9);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    if (ema20 == null || ema9 == null || rsi == null) return null;

    const ema20_1 = ctx.ema(20, 1);
    const ema9_1  = ctx.ema(9,  1);
    const rsi_1   = ctx.rsi(14, 1);
    if (ema20_1 == null || ema9_1 == null || rsi_1 == null) return null;

    const hasPos = ctx.position > 0;

    // Golden cross: EMA-9 crosses above EMA-20 + RSI confirming
    const goldenCross = ema9_1 <= ema20_1 && ema9 > ema20;
    const rsiConfirm = rsi > 50;

    if (!hasPos && goldenCross && rsiConfirm) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // Death cross: EMA-9 crosses below EMA-20 — trend reversed
    const deathCross = ema9_1 >= ema20_1 && ema9 < ema20;

    // 15% hard stop — only triggers in true crashes, not pullbacks
    const stopLoss = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.15;

    if (hasPos && (deathCross || stopLoss)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
