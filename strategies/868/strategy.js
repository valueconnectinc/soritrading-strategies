/*
 * @coinsori-strategy v1
 * name: BTC RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the RSI indicator to identify overbought and oversold conditions. When the RSI drops below 30 (oversold), it indicates a potential buying opportunity. When the RSI rises above 70 (overbought), it signals a selling opportunity. This is a mean reversion approach based on RSI.
 * When it buys and sells: It buys when RSI falls below 30 and sells when RSI rises above 70.
 * When it does NOT work: This strategy may fail in strong trending markets where the price remains consistently high or low for an extended period, reducing the effectiveness of the RSI mean reversion approach.
 */

function onUpdate(ctx) {
    // Get RSI value with default parameter (14)
    const rsi = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1); 
    
    // Check if we have enough data
    if (rsi == null || rsiPrev == null) return null;

    // RSI crosses below 30 (oversold condition)
    if (rsiPrev >= 30 && rsi < 30) {
        // Buy when RSI is oversold
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    } 
    // RSI crosses above 70 (overbought condition)
    else if (rsiPrev <= 70 && rsi > 70) {
        // Sell when RSI is overbought
        return { side: 'sell', qty: ctx.position };
    }
    
    // No action if no crossover
    return null;
}
