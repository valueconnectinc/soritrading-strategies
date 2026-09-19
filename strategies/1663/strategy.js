/*
 * @coinsori-strategy v1
 * name: Bollinger Bands Mean Reversion with RSI Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Markets spend most time in ranges, not trends. Mean reversion
 * strategies exploit the tendency of prices to revert to the mean after extreme moves.
 * Bollinger Bands provide dynamic support/resistance based on recent volatility.
 * When it buys and sells: Buy when price touches or breaks below the lower Bollinger Band
 * AND RSI is oversold (<35) confirming a reversal. Sell when price touches or breaks
 * above the upper Bollinger Band AND RSI is overbought (>65).
 * When it does NOT work: In strong trending markets, price can "walk" the bands and
 * continue beyond mean reversion points, causing significant drawdowns.
 */
function onUpdate(ctx) {
    // Get Bollinger Bands (20-period, 2 standard deviations)
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    
    // Get RSI (14-period)
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;
    
    // Current price
    const price = ctx.price;
    
    // Previous bar indicators for crossover detection
    const bb1 = ctx.bb(20, 2, 1);
    const rsi1 = ctx.rsi(14, 1);
    
    if (bb1 == null || rsi1 == null) return null;
    
    // BUY: Price crossed below lower band AND RSI oversold (<35)
    const atLowerBand = price <= bb.lower;
    const wasAboveLower = price > bb1.lower;
    const rsiOversold = rsi < 35;
    
    if (atLowerBand && wasAboveLower && rsiOversold && ctx.position <= 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    
    // SELL: Price crossed above upper band AND RSI overbought (>65)
    const atUpperBand = price >= bb.upper;
    const wasBelowUpper = price < bb1.upper;
    const rsiOverbought = rsi > 65;
    
    if (atUpperBand && wasBelowUpper && rsiOverbought && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }
    
    return null;
}
