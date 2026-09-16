/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000

 * Why this strategy: This is a simple moving average crossover strategy that aims to capture trend changes. It buys when a short-term MA crosses above a long-term MA and sells when it crosses below, without additional filters.
 * When it buys and sells: The strategy buys when a 20-period EMA crosses above a 50-period EMA, and sells when a 20-period EMA crosses below a 50-period EMA.
 * When it does NOT work: This simple strategy may underperform in ranging markets where trends are not clearly defined. It can also produce whipsaw effects due to its simplicity without additional filters.
 */
function onUpdate(ctx) {
    // Get required indicators
    const ema20 = ctx.ema(20);
    const ema50 = ctx.ema(50);
    
    // Guard against null values
    if (ema20 == null || ema50 == null) {
        return null;
    }
    
    // Calculate previous EMA values
    const prevEma20 = ctx.ema(20, 1);
    const prevEma50 = ctx.ema(50, 1);
    
    if (prevEma20 == null || prevEma50 == null) {
        return null;
    }
    
    // Check for crossover
    const isBullish = ema20 > ema50 && prevEma20 <= prevEma50;  // Bullish crossover
    const isBearish = ema20 < ema50 && prevEma20 >= prevEma20;  // Bearish crossover
    
    // Define trade conditions
    let side = null;
    
    if (isBullish) {
        side = 'buy';
    } else if (isBearish) {
        side = 'sell';
    }
    
    // Return order object if we have a trade signal, otherwise return null
    if (side !== null) {
        const qty = side === 'buy' ? ctx.cash / ctx.price * 0.95 : ctx.position;
        return { side: side, qty: qty };
    }
    
    return null;
}
