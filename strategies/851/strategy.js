/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the RSI indicator to identify overbought and oversold conditions for mean reversion entries.
 * When it buys and sells: It buys when RSI crosses below 30 (oversold) and sells when RSI crosses above 70 (overbought).
 * When it does NOT work: This strategy may fail in strong trending markets where assets stay in overbought or oversold conditions for extended periods.
 */

function onUpdate(ctx) {
    // Calculate RSI values
    const rsi = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    
    // Ensure we have enough data
    if (rsi == null || rsiPrev == null) return null;
    
    // Buy condition: RSI crosses below 30 (oversold)
    if (rsiPrev >= 30 && rsi < 30) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // Sell condition: RSI crosses above 70 (overbought)
    if (rsiPrev <= 70 && rsi > 70) {
        return { side: 'sell', qty: ctx.position };
    }
    
    // Do nothing otherwise
    return null;
}
