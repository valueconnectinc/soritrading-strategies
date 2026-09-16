/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with Volatility Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines RSI mean reversion with a volatility filter to identify potential overbought/oversold conditions while avoiding trades during high-volatility periods. It aims to improve signal quality by filtering out trades in choppy market conditions.
 * When it buys and sells: The strategy buys when RSI is below 30 and volatility (ATR) is below its 20-period average, indicating a potential reversal after an oversold condition. It sells when RSI is above 70 and volatility is below the average, suggesting a potential reversal after an overbought condition.
 * When it does NOT work: This strategy may fail in trending markets where RSI does not provide reliable signals or during extended periods of low volatility, which can mask true market direction. It also does not account for sudden market shocks that may occur outside normal volatility ranges.
 */
function onUpdate(ctx) {
    // Get indicators
    const rsi = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    const atr = ctx.atr(14, 0);
    const atrAvg = ctx.atr(14, 0); // For consistency, using same period as current ATR
    const vol = ctx.vol;
    
    // Ensure we have enough data for all indicators
    if (rsi == null || rsiPrev == null || atr == null || atrAvg == null) {
        return null;
    }

    // Calculate volatility filter (using 20-period average ATR)
    const avgAtr = ctx.atr(14, 20);
    
    // Check if we have enough data for average ATR
    if (avgAtr == null) {
        return null;
    }
    
    // Volatility filter condition: current ATR below its 20-period average
    const volatilityFilter = atr < avgAtr;

    // Buy condition: RSI crosses below 30 and volatility is low
    const buyCondition = (rsiPrev <= 30 && rsi > 30) && volatilityFilter;
    
    // Sell condition: RSI crosses above 70 and volatility is low
    const sellCondition = (rsiPrev >= 70 && rsi < 70) && volatilityFilter;

    if (buyCondition) {
        // Return buy order with 99% of available cash
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    } else if (sellCondition) {
        // Return sell order to close position
        return { side: 'sell', qty: ctx.position };
    }

    // No trade signal
    return null;
}
