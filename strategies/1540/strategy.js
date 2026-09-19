/*
 * @coinsori-strategy v1
 * name: EMA Cross RSI Filter
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover catches medium-term trend shifts on DOGEUSDT 4H.
 * When it buys and sells: Buys when fast EMA crosses above slow EMA AND RSI is in bullish zone (40–65, not overbought). Sells when fast EMA crosses below slow EMA.
 * When it does NOT work: In choppy markets with no clear trend — EMA crossovers whipsaw and generate losses. Also fails when RSI enters overbought on a fake breakout.
 */

function onUpdate(ctx) {
    // Warm-up: need EMA(50) and EMA(200) — EMA200 needs ~200 bars
    const emaFast1 = ctx.ema(20, 1);
    const emaFast2 = ctx.ema(20, 2);
    const emaSlow1 = ctx.ema(50, 1);
    const emaSlow2 = ctx.ema(50, 2);
    if (emaFast1 == null || emaSlow1 == null) return null;

    // Also need RSI
    const rsi = ctx.rsi(14, 1);
    if (rsi == null) return null;

    // BUY: fast EMA crosses above slow EMA (bullish golden cross)
    const bullishCross = emaFast2 <= emaSlow2 && emaFast1 > emaSlow1;
    // RSI in confirmatory zone: above 40 (not oversold recovery) and below 65 (not overbought)
    const rsiConfirm = rsi > 40 && rsi < 65;

    if (bullishCross && rsiConfirm && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL: fast EMA crosses below slow EMA (bearish death cross)
    const bearishCross = emaFast2 >= emaSlow2 && emaFast1 < emaSlow1;

    if (bearishCross && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
