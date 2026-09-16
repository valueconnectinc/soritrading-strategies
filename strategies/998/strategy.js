/*
 * @coinsori-strategy v1
 * name: BB + RSI Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy combines Bollinger Band mean reversion with an RSI filter to avoid entering during overbought/oversold conditions, aiming for more reliable entries.
 * When it buys and sells: It buys when price touches the lower BB band and RSI is below 30 (oversold). It sells when price hits the upper BB band and RSI is above 70 (overbought).
 * When it does NOT work: This strategy fails in strong trending markets where price moves consistently beyond the Bollinger Bands without reverting.
 */

function onUpdate(ctx) {
    // === INDICATORS ===
    const bb = ctx.bb(20, 2, 0);           // Bollinger Bands (20 period, 2 std dev)
    const rsi = ctx.rsi(14, 0);            // RSI (14 period)
    
    // === GUARD AGAINST NULL VALUES ===
    if (bb == null || rsi == null) return null;
    
    // === ENTRY CONDITIONS ===
    // Buy when price touches lower BB and RSI is oversold (< 30)
    const isBuySignal = ctx.price <= bb.lower && rsi < 30;
    
    // Sell when price touches upper BB and RSI is overbought (> 70)
    const isSellSignal = ctx.price >= bb.upper && rsi > 70;
    
    // === TRADE EXECUTION ===
    if (isBuySignal && ctx.position <= 0) {
        // Enter long position
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    if (isSellSignal && ctx.position > 0) {
        // Close long position
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
