/*
 * @coinsori-strategy v1
 * name: MACD Trend Following Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the MACD indicator to identify trend changes and entries.
 * When it buys and sells: It buys when the MACD line crosses above its signal line, and sells when it crosses below.
 * When it does NOT work: This strategy may fail in ranging markets where there is no clear trend direction.
 */

function onUpdate(ctx) {
    // Calculate MACD values
    const macd = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    
    // Ensure we have enough data
    if (macd == null || macdPrev == null) return null;
    
    // Buy condition: MACD line crosses above signal line
    if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // Sell condition: MACD line crosses below signal line
    if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal) {
        return { side: 'sell', qty: ctx.position };
    }
    
    // Do nothing otherwise
    return null;
}
