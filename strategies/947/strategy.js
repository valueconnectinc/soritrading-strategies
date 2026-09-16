/*
 * @coinsori-strategy v1
 * name: RSI Momentum Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy uses Relative Strength Index (RSI) to identify momentum changes. It buys when RSI moves from below 30 (oversold) to above 30, and sells when it moves from above 70 (overbought) to below 70.
 * When it buys and sells: The strategy buys when RSI crosses above 30 (indicating positive momentum), and sells when RSI crosses below 70 (indicating negative momentum).
 * When it does NOT work: This strategy may fail in strong trending markets where prices continue moving in one direction without retracing to the RSI thresholds. It also might be prone to false signals during consolidation periods.
 */
function onUpdate(ctx) {
    // Get required indicators
    const rsi = ctx.rsi(14);
    
    // Guard against null values
    if (rsi == null) {
        return null;
    }
    
    // Calculate previous RSI value
    const prevRsi = ctx.rsi(14, 1);
    
    if (prevRsi == null) {
        return null;
    }
    
    // Check for RSI crossing thresholds
    const rsiBuySignal = rsi > 30 && prevRsi <= 30;  // RSI crosses above 30 (from oversold)
    const rsiSellSignal = rsi < 70 && prevRsi >= 70;  // RSI crosses below 70 (from overbought)
    
    // Define trade conditions
    let side = null;
    
    if (rsiBuySignal) {
        side = 'buy';
    } else if (rsiSellSignal) {
        side = 'sell';
    }
    
    // Return order object if we have a trade signal, otherwise return null
    if (side !== null) {
        const qty = side === 'buy' ? ctx.cash / ctx.price * 0.95 : ctx.position;
        return { side: side, qty: qty };
    }
    
    return null;
}
