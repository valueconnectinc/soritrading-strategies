/*
 * @coinsori-strategy v1
 * name: BTC Bollinger Squeeze Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Bollinger Band squeeze breakout with RSI confirmation.
 * When the bands squeeze tightly and BTC breaks above the upper band with RSI confirming momentum, we enter long.
 * When price breaks below middle band or RSI turns overbought, we exit.
 * Does not work in choppy, low-volatility markets where squeeze signals are false.
 */
function onUpdate(ctx) {
    const bb = ctx.bb(21, 2, 2);
    const rsi = ctx.rsi(14, 2);
    const sma200 = ctx.sma(200, 2);
    const rsi0 = ctx.rsi(14, 0);
    const bb0 = ctx.bb(21, 2, 0);
    if (bb == null || rsi == null || sma200 == null || bb0 == null || rsi0 == null) return null;
    if (bb.lower == null || bb.mid == null || bb.upper == null) return null;
    if (bb0.lower == null || bb0.mid == null || bb0.upper == null) return null;

    const price = ctx.price;
    const position = ctx.position;
    const prevClose = ctx.closes[1]; // previous bar's close

    // === SQUEEZE DETECTION ===
    // Bandwidth as % of mid — squeeze when narrow
    const prevBandwidth = (bb.upper - bb.lower) / bb.mid;
    const curBandwidth = (bb0.upper - bb0.lower) / bb0.mid;
    const squeezeThresh = 0.04; // bands within 4% of each other = squeeze
    const wasSqueezed = prevBandwidth < squeezeThresh;

    // === ENTRY: squeeze releasing upward ===
    // Previous bar: close at or below previous upper band. Current bar: price breaks above current upper band.
    const breakAbove = prevClose <= bb.upper && price > bb0.upper;

    // RSI confirming momentum (not overbought yet — leave room to run)
    const rsiConfirm = rsi0 > 40 && rsi0 < 70;

    // Long-term trend: price above SMA 200
    const bullTrend = price > sma200;

    if (!position && wasSqueezed && breakAbove && rsiConfirm && bullTrend) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price crosses below middle band OR RSI overbought ===
    const crossBelowMid = price < bb0.mid;
    const rsiOverbought = rsi0 > 75;
    if (position && (crossBelowMid || rsiOverbought)) {
        return { side: 'sell', qty: position };
    }

    return null;
}
