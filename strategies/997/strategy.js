/*
 * @coinsori-strategy v1
 * name: Mean Reversion with Trend Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a combination of Bollinger Bands for mean reversion and an additional trend filter (SMA) to avoid entering during strong trends. It helps reduce false signals and focus on mean-reverting opportunities.
 * When it buys and sells: The strategy enters a long position when price crosses above the upper BB band and the 50-period SMA is rising. It exits when the price crosses below the lower BB band.
 * When it does NOT work: This strategy struggles during strong trending markets where the price continues to move in one direction, and BB bands do not contract properly.
 */

function onUpdate(ctx) {
    // Fetch indicators
    const bb = ctx.bb(20, 2); // Bollinger Bands (20-period, 2 std dev)
    const sma = ctx.sma(50); // 50-period SMA for trend filter
    
    // Guard against null indicators  
    if (bb == null || sma == null) return null;

    // Previous values (ago=1)
    const bb_prev = ctx.bb(20, 2, 1);
    const sma_prev = ctx.sma(50, 1);

    // Guard against null previous values
    if (bb_prev == null || sma_prev == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // Initialize order object
    let order = null;

    // Buy condition: price crosses above upper BB, and 50-period SMA is rising  
    if (price > bb.upper && price < bb_prev.upper && sma > sma_prev) {
        // Only enter if not already in position
        if (position <= 0) {
            return { side: 'buy', qty: ctx.cash / price * 0.95 }; // Buy with 95% of available cash
        }
    }

    // Sell condition: price crosses below lower BB 
    if (price < bb.lower && price > bb_prev.lower) {
        // Only exit if in a long position
        if (position > 0) {
            return { side: 'sell', qty: position };
        }
    }

    // Return null if no trade signal
    return null;
}
