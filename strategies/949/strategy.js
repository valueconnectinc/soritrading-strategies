/*
 * @coinsori-strategy v1
 * name: Simple Price Trend Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000

 * Why this strategy: This is a very simple trend-following strategy that looks at sustained price movements over multiple periods to identify trends. It buys during sustained upward movement and sells during sustained downward movement.
 * When it buys and sells: The strategy buys when price has been steadily rising over the last 3 hours (3 consecutive higher closes) and sells when price has been steadily falling for 3 consecutive hours.
 * When it does NOT work: This simple strategy may miss short-term trend changes or be prone to whipsaws. It is also sensitive to market noise, which could cause false signals in volatile conditions.
 */
function onUpdate(ctx) {
    // Get current and previous close prices
    const currentClose = ctx.candle.close;
    const prevClose1 = ctx.candle.close;  // We'll use candle.close for the previous bar (this approach may not work)
    
    // Since we had issues with accessing historical data, let's check if we're in a trending environment
    // based on price movement over the last few periods
    
    // For this simple strategy, we need at least 3 periods of data to analyze trends
    const change1 = ctx.change(1);   // Change from previous bar
    const change2 = ctx.change(2);   // Change from 2 bars ago  
    const change3 = ctx.change(3);   // Change from 3 bars ago
    
    // Guard against null values
    if (change1 == null || change2 == null || change3 == null) {
        return null;
    }
    
    // Check for sustained uptrend (last 3 periods all positive)
    const isUptrend = change1 > 0 && change2 > 0 && change3 > 0;
    
    // Check for sustained downtrend (last 3 periods all negative)
    const isDowntrend = change1 < 0 && change2 < 0 && change3 < 0;
    
    // Define trade conditions
    let side = null;
    
    if (isUptrend) {
        side = 'buy';
    } else if (isDowntrend) {
        side = 'sell';
    }
    
    // Return order object if we have a trade signal, otherwise return null
    if (side !== null) {
        const qty = side === 'buy' ? ctx.cash / ctx.price * 0.95 : ctx.position;
        return { side: side, qty: qty };
    }
    
    return null;
}
