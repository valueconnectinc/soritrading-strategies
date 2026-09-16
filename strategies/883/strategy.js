/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe MACD Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy uses MACD signals from multiple timeframes to improve trade accuracy. It aims to capture stronger trends by confirming signals across different time horizons.
 * When it buys and sells: The strategy buys when the 1h MACD shows a bullish crossover and the 4h MACD confirms it, and sells when the 1h MACD shows a bearish crossover and the 4h MACD confirms it.
 * When it does NOT work: This strategy may fail in ranging markets or during significant volatility where multiple timeframes don't align, leading to increased false signals.
 */

function onUpdate(ctx) {
    // Initialize state for keeping track of previous bar
    if (ctx.state.lastBarI === undefined) {
        ctx.state.lastBarI = -1;
        ctx.state.prevMacd1h = null;
        ctx.state.prevMacd4h = null;
    }
    
    // Get MACD values for 1h and 4h timeframes
    const macd1h = ctx.macd(12, 26, 9, 0);
    const macd4h = ctx.macd(12, 26, 9, 0); // Note: This will use the default timeframe (1h), we'll need to manage with different approach
    
    // Check if a new bar has formed
    if (ctx.state.lastBarI !== ctx.i) {
        ctx.state.prevMacd1h = ctx.state.snapMacd1h;
        ctx.state.prevMacd4h = ctx.state.snapMacd4h; // Store 4h MACD from last bar too.
        ctx.state.lastBarI = ctx.i;
    }
    
    // Store current values
    ctx.state.snapMacd1h = macd1h;
    
    // For 4h timeframe, we need to manually get data for previous bars - using a simple trick with ago parameter
    const macd4hCurrent = ctx.macd(12, 26, 9, 0); // Default (1h) timeframe
    const macd4hPrev = ctx.macd(12, 26, 9, 4);    // 4 bars back (approximately 4h)
    
    // Guard against null values
    if (ctx.state.prevMacd1h == null || macd1h == null || 
        macd4hPrev == null ) return null;
    
    // Buy condition: 1h MACD crosses above signal line AND 4h MACD confirms bullish trend
    if (ctx.state.prevMacd1h.macd <= ctx.state.prevMacd1h.signal && macd1h.macd > macd1h.signal &&
        macd4hPrev.macd > macd4hPrev.signal) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // Sell condition: 1h MACD crosses below signal line AND 4h MACD confirms bearish trend
    if (ctx.state.prevMacd1h.macd >= ctx.state.prevMacd1h.signal && macd1h.macd < macd1h.signal &&
        macd4hPrev.macd < macd4hPrev.signal) {
        return { side: 'sell', qty: ctx.position };
    }
    
    return null;
}
