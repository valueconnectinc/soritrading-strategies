/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: AVAX 4h oscillates around its mean — buying when price
 * dips below the lower Bollinger Band catches oversold bounces before reversal.
 * When it buys and sells: Buys when price closes below the lower Bollinger Band
 * AND RSI < 40 (confirming oversold). Sells when price reaches the upper band
 * OR RSI > 65 (taking profit at overbought).
 * When it does NOT work: Strong trending markets — price can stay below the
 * lower band for long periods during downtrends, causing accumulating losses.
 */
function onUpdate(ctx) {
    // Bollinger Bands: 20-period, 2 standard deviations
    const bb = ctx.bb(20, 2, 1); // 1 bar ago = last closed bar
    if (bb == null || bb.lower == null || bb.mid == null || bb.upper == null) return null;

    const rsi = ctx.rsi(14, 1);
    if (rsi == null) return null;

    const price = ctx.price;
    const lowerBand = bb.lower;
    const upperBand = bb.upper;

    // Entry: price dips below lower Bollinger Band, RSI confirming oversold
    const longCondition = price < lowerBand && rsi < 40;

    // Exit: price reaches upper band OR RSI overbought
    const shortCondition = price > upperBand || rsi > 65;

    if (ctx.position === 0 && longCondition) {
        return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
    }

    if (ctx.position > 0 && shortCondition) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
