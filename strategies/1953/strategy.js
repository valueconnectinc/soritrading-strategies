/*
 * @coinsori-strategy v1
 * name: RSI Divergence + EMA Trend Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: RSI divergence catches momentum reversals at overbought/oversold extremes,
 * while EMA(20) confirms the trend direction — combining a leading indicator with a
 * trend-following filter to reduce false signals in volatile crypto markets.
 * Buys when RSI shows bullish divergence + price above EMA20 (uptrend confirmation).
 * Sells when RSI shows bearish divergence or price crosses below EMA20.
 * Does NOT work: in choppy, range-bound markets where RSI oscillates without clear divergence
 * and EMA provides no direction — both conditions fire too often.
 */
function onUpdate(ctx) {
    // RSI(14) — current and 5 bars ago for divergence check
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const rsi5 = ctx.rsi(14, 5);
    if (rsi5 == null) return null;

    // Price: current and 5 bars ago
    const price5 = ctx.closes[ctx.closes.length - 6];
    if (price5 == null) return null;

    // EMA(20) for trend direction
    const ema20 = ctx.ema(20);
    if (ema20 == null) return null;

    // ATR(14) for stop-loss distance
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Volume confirmation: current vol > 20-bar average
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volConfirm = ctx.vol > avgVol;

    // Bullish divergence: price made lower low over 5 bars, RSI made higher low
    const priceLowerLow = ctx.price < price5;
    const rsiHigherLow = rsi > rsi5;

    // Bearish divergence: price made higher high over 5 bars, RSI made lower high
    const priceHigherHigh = ctx.price > price5;
    const rsiLowerHigh = rsi < rsi5;

    // Trend: price above EMA20 = uptrend
    const uptrend = ctx.price > ema20;

    // === ENTRY: bullish divergence + uptrend + volume confirm ===
    if (priceLowerLow && rsiHigherLow && uptrend && volConfirm && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // === EXIT: bearish divergence + price drops below EMA20 ===
    if (ctx.position > 0) {
        const bearishDiv = priceHigherHigh && rsiLowerHigh;
        const trendBroken = ctx.price < ema20;

        if (bearishDiv || trendBroken) {
            return { side: 'sell', qty: ctx.position };
        }

        // Trailing stop: 2.5 ATR from entry
        if (ctx.entryPx != null) {
            const stopPx = ctx.entryPx - 2.5 * atr;
            if (ctx.price < stopPx) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    return null;
}
