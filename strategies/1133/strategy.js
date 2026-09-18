/*
 * @coinsori-strategy v1
 * name: EMA Crossover Momentum
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Classic dual-EMA crossover trend-following strategy. Buys when the fast EMA
 * crosses above the slow EMA (uptrend confirmed), sells when it crosses back
 * below (trend reversal). RSI filters out entries in overbought territory.
 * This is a TREND-FOLLOWING strategy — opposite signal logic to mean-reversion.
 * When it does NOT work: choppy markets where EMAs cross repeatedly, causing
 * whipsaws and small losses that compound into underperformance.
 */

function onUpdate(ctx) {
    // Warm-up: need at least 21 bars for the slow EMA
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    const rsi = ctx.rsi(14);
    if (emaFast == null || emaSlow == null || rsi == null) return null;

    // Read CLOSED bars (ago=1) for crossover detection — stable, not live-bar noise
    const emaFastPrev = ctx.ema(9, 1);
    const emaSlowPrev = ctx.ema(21, 1);

    // ── ENTRY: fast EMA crosses ABOVE slow EMA (golden cross) ──
    // RSI below 65 = not already extended (avoids buying at RSI peaks)
    const bullishCross = emaFastPrev <= emaSlowPrev && emaFast > emaSlow;
    const notOverbought = rsi < 65;

    if (bullishCross && notOverbought && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: fast EMA crosses BELOW slow EMA (death cross) ──
    // OR RSI reaches overbought (RSI > 75) — take profit before reversal
    const bearishCross = emaFastPrev >= emaSlowPrev && emaFast < emaSlow;
    const rsiOverbought = rsi > 75;

    if ((bearishCross || rsiOverbought) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
