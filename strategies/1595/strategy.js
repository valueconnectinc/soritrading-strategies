/*
 * @coinsori-strategy v1
 * name: SOL Trend Rider v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: SOL is a strongly trending asset where momentum tends to persist.
 * Buy when price breaks above SMA20 with RSI confirming upward momentum — ride the trend until it breaks.
 * When it buys and sells: Buys when price crosses above SMA20 (trend start) AND RSI > 40 (momentum filter).
 * Sells when price crosses below SMA20 (trend broken) or when RSI peaks above 75 (momentum exhaustion).
 * When it does NOT work: Fails in choppy, directionless markets with frequent SMA crossings (whipsaw losses).
 */

function onUpdate(ctx) {
    const sma20   = ctx.sma(20);
    const sma20P1 = ctx.sma(20, 1); // 1 bar ago (previous closed bar)
    const sma20P2 = ctx.sma(20, 2); // 2 bars ago
    const rsi     = ctx.rsi(14);
    const rsiP1   = ctx.rsi(14, 1);

    // Warm-up: need at least 20 bars for SMA + 14 for RSI
    if (sma20 == null || sma20P1 == null || sma20P2 == null) return null;
    if (rsi == null || rsiP1 == null) return null;

    const price     = ctx.price;
    const prevClose = ctx.candle.close;
    const prevCloseP1 = ctx.candle.close; // same for ago=1 (we need the closed bar)
    // Use closes array for previous bars
    const closes    = ctx.closes;
    const prevClose1 = closes[1]; // 1 bar ago closed price
    const prevClose2 = closes[2]; // 2 bars ago closed price

    const position = ctx.position;

    // === ENTRY: price crossed ABOVE SMA20 on the previous bar ===
    // i.e., prev bar close was below/equal SMA, current price is above SMA
    const crossUp = (prevClose1 <= sma20P1) && (price > sma20);
    // Momentum filter: RSI already above 40 (not yet overbought, but confirming)
    const momentumOk = rsi > 40;

    if (crossUp && momentumOk && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price crossed BELOW SMA20 (trend broken) ===
    const crossDown = (prevClose1 > sma20P1) && (price < sma20);

    if (crossDown && position > 0) {
        return { side: 'sell', qty: position };
    }

    // === EXIT: RSI peaked above 75 and is now falling (take profit on exhaustion) ===
    const rsiPeak = (rsiP1 > 75) && (rsi < rsiP1);

    if (rsiPeak && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
