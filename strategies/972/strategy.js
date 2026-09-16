/*
 * @coinsori-strategy v1
 * name: Simplified Mean Reversion with Bollinger Bands Only
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This simplified version focuses purely on Bollinger Band mean reversion without additional filters. It aims to capture the core mean reversion behavior while avoiding over-complication that may be causing poor performance.
 * When it buys and sells: It buys when price touches the lower Bollinger Band, and sells when price touches the upper Bollinger Band. The strategy assumes that price will revert to the mean after touching the bands.
 * When it does NOT work: This strategy may fail during strong trending markets where the price consistently moves outside the Bollinger Bands for extended periods. It also underperforms in choppy or range-bound markets without clear mean-reversion opportunities.
 */
function onUpdate(ctx) {
    // Get indicators
    const bb = ctx.bb(20, 2); // Bollinger Bands with 20 period and 2 standard deviations
    
    // Guard against null values
    if (bb == null) return null;
    
    let order = null;
    
    // Buy condition: Price touches lower Bollinger Band
    if (ctx.price <= bb.lower) {
        // Only enter if we don't already have a position
        if (ctx.position === 0) {
            // Buy with 99% of available cash
            const qty = ctx.cash / ctx.price * 0.99;
            
            order = { side: 'buy', qty: qty };
        }
    }
    
    // Sell condition: Price touches upper Bollinger Band
    if (ctx.price >= bb.upper) {
        // Only close position if we have an existing long position
        if (ctx.position > 0) {
            order = { side: 'sell', qty: ctx.position };
        }
    }
    
    return order;
}
