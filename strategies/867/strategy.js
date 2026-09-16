/*
 * @coinsori-strategy v1
 * name: BTC MACD Trend Following Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy follows the trend using MACD indicator. When the MACD line crosses above the signal line, it indicates a bullish trend, and we enter a long position. Conversely, when the MACD line crosses below the signal line, it indicates a bearish trend, and we exit any existing long position.
 * When it buys and sells: It buys when the MACD line crosses above the signal line and sells when the MACD line crosses below the signal line.
 * When it does NOT work: This strategy may fail in a sideways or range-bound market where there is no clear trend, leading to frequent entry and exit signals that can result in losses from transaction costs.
 */

function onUpdate(ctx) {
    // Get MACD values with default parameters (12, 26, 9)
    const macd = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1); 
    // Check if we have enough data
    if (macd == null || macdPrev == null) return null;

    // MACD line crossing above signal line (bullish crossover)
    if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) {
        // Buy when the trend is bullish
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    } 
    // MACD line crossing below signal line (bearish crossover)
    else if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal) {
        // Sell when the trend is bearish
        return { side: 'sell', qty: ctx.position };
    }
    
    // No action if no crossover
    return null;
}
