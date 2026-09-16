/*
 * @coinsori-strategy v1
 * name: Simple RSI Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a simple RSI crossover filter to enter trades. It aims to capture trends when the market is in a clear overbought or oversold condition, avoiding trades during neutral phases.
 * When it buys and sells: The strategy buys when RSI crosses above 30 (indicating oversold conditions) and sells when RSI crosses below 70 (indicating overbought conditions).
 * When it does NOT work: This strategy might not perform well in very flat or sideways markets where RSI stays within the neutral zone, resulting in few trades.
 */

function onUpdate(ctx) {
    // Get RSI values
    const rsi = ctx.rsi(14);  // RSI with 14-period
    const rsiPrev = ctx.rsi(14, 1);  // Previous RSI value

    // Guard: Ensure RSI is available
    if (rsi == null || rsiPrev == null) {
        return null;  // Wait for more data
    }

    // Buy condition: RSI crosses above 30 (oversold)
    if (rsiPrev <= 30 && rsi > 30) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Sell condition: RSI crosses below 70 (overbought)
    if (rsiPrev >= 70 && rsi < 70) {
        return { side: 'sell', qty: ctx.position }; // Close position
    }

    // No action needed
    return null;
}
