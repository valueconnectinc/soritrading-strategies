/*
 * @coinsori-strategy v1
 * name: EMA Crossover Momentum
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Classic dual-EMA crossover trend-following strategy. Buys when the fast EMA
 * crosses above the slow EMA (golden cross), sells when it crosses back below
 * (death cross). RSI filters out overbought entries.
 * When it does NOT work: choppy markets where EMAs cross repeatedly (whipsaws),
 * compounding small losses into significant underperformance.
 */

function onUpdate(ctx) {
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    const rsi = ctx.rsi(14);
    if (emaFast == null || emaSlow == null || rsi == null) return null;

    // Crossover on closed bars (ago=1) — stable, no live-bar noise
    const emaFastPrev = ctx.ema(9, 1);
    const emaSlowPrev = ctx.ema(21, 1);
    if (emaFastPrev == null || emaSlowPrev == null) return null;

    // ── ENTRY: fast EMA crosses above slow EMA + RSI not extended ──
    const bullishCross = emaFastPrev <= emaSlowPrev && emaFast > emaSlow;
    if (bullishCross && rsi < 65 && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: fast EMA crosses below slow EMA OR RSI overbought ──
    const bearishCross = emaFastPrev >= emaSlowPrev && emaFast < emaSlow;
    if ((bearishCross || rsi > 75) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
