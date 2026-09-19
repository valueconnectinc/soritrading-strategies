/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + RSI
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL often mean-reverts off Bollinger Bands on the 4h chart.
 * Adding RSI filters out weak signals — only buy when deeply oversold at the lower
 * band, and only sell when overbought at the upper band.
 * When it buys and sells: Buys when price touches the lower Bollinger Band AND RSI < 30.
 * Sells when price touches the upper Bollinger Band AND RSI > 70.
 * When it does NOT work: Trending markets — if SOL breaks trend without reverting,
 * the strategy buys the dip that keeps dipping, or sells the breakout that keeps running.
 */

function onUpdate(ctx) {
    // Need 20 bars for BB(20)
    const bb = ctx.bb(20, 2, 1);
    if (bb == null) return null;

    const rsi = ctx.rsi(14, 1);
    if (rsi == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // Buy: price at or below lower band, RSI oversold, no open position
    if (price <= bb.lower && rsi < 30 && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // Sell: price at or above upper band, RSI overbought, have a position
    if (price >= bb.upper && rsi > 70 && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
