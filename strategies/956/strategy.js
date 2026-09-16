/*
 * @coinsori-strategy v1
 * name: MACD with RSI Filter
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD and RSI to filter trade entries. It aims to improve upon a simple RSI strategy by using MACD for trend confirmation.
 * When it buys and sells: Buys when MACD line crosses above signal line and RSI is below 30 (oversold). Sells when MACD line crosses below signal line and RSI is above 70 (overbought).
 * When it does NOT work: This strategy may not perform well in a flat or choppy market, where MACD signals are unreliable or RSI stays neutral.
 */

function onUpdate(ctx) {
    // Get MACD values
    const macd = ctx.macd(12, 26, 9);
    const macdPrev = ctx.macd(12, 26, 9, 1);  // Previous MACD value

    // Get RSI values
    const rsi = ctx.rsi(14);
    const rsiPrev = ctx.rsi(14, 1);

    // Guard: Ensure MACD and RSI are available
    if (macd == null || macdPrev == null || rsi == null || rsiPrev == null) {
        return null;  // Wait for more data
    }

    // Buy condition: MACD crossover with RSI below 30 (oversold)
    if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && rsi < 30) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Sell condition: MACD crossover with RSI above 70 (overbought)
    if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && rsi > 70) {
        return { side: 'sell', qty: ctx.position }; // Close position
    }

    // No action needed
    return null;
}
