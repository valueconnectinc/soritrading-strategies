/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The strategy aims to capture momentum shifts using MACD crossover signals, while filtering out low-volume periods that may lead to false signals. This approach is designed to reduce the risk of entering trades during uncertain market conditions.
 * When it buys and sells: It buys when the MACD line crosses above the signal line, and sells when the MACD line crosses below the signal line, with a condition that the volume must be above the average volume over the last 20 periods.
 * When it does NOT work: This strategy may fail during ranging markets where there is no clear momentum, or during high volatility periods where volume spikes do not accurately reflect trend strength.
 */

function onUpdate(ctx) {
    // Get MACD values
    const macd = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    
    // Get volume and average volume
    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    
    // Guard against null values
    if (macd == null || macdPrev == null) return null;
    
    // Buy condition: MACD line crosses above signal line, and volume is above average
    if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && vol > avgVol) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // Sell condition: MACD line crosses below signal line, and volume is above average
    if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && vol > avgVol) {
        return { side: 'sell', qty: ctx.position };
    }
    
    return null;
}
