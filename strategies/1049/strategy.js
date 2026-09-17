/*
 * @coinsori-strategy v1
 * name: SMA-20 Trend Follow Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Simple trend-following: buy when price crosses above SMA(20), sell when it crosses below.
 * Uses ATR stop to limit losses in choppy markets.
 * Works best in trending markets (clear uptrends/downtrends).
 * When it does NOT work: choppy, range-bound markets — whipsaws cause repeated small losses.
 */
function onUpdate(ctx) {
    // Need at least 21 bars for SMA(20) + ATR(14)
    const smaNow = ctx.sma(20);
    if (smaNow == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Current and previous close via closes array
    const closes = ctx.closes;
    if (!closes || closes.length < 2) return null;

    const closeNow  = closes[0];  // current bar close
    const closePrev = closes[1]; // previous bar close
    const smaPrev   = ctx.sma(20, 1);
    if (smaPrev == null) return null;

    const hasPosition = ctx.position > 0;
    const noPosition  = ctx.position <= 0;

    // ---- ENTRY: price crosses ABOVE SMA(20) ----
    // Yesterday below/equal SMA, today above — bullish crossover
    if (noPosition && closePrev <= smaPrev && closeNow > smaNow) {
        return {
            side: 'buy',
            qty: ctx.cash / closeNow * 0.99,
            type: 'limit',
            price: closeNow
        };
    }

    // ---- EXIT: price crosses BELOW SMA(20) ----
    // Yesterday above/equal SMA, today below — bearish crossover
    if (hasPosition && closePrev >= smaPrev && closeNow < smaNow) {
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'limit',
            price: closeNow
        };
    }

    // ---- HARD STOP: ATR trailing stop (only if in position) ----
    if (hasPosition) {
        // Exit if price drops more than 1.5 × ATR below entry
        const stopPx = ctx.entryPx - 1.5 * atr;
        if (closeNow < stopPx) {
            return {
                side: 'sell',
                qty: ctx.position,
                type: 'limit',
                price: closeNow
            };
        }
    }

    return null;
}
