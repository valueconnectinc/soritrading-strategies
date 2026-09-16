/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses RSI for mean reversion signals and adds a volatility filter to avoid trading during extreme market movements. It bets on price returning to its mean after overbought/oversold conditions.
 * When it buys and sells: It buys when RSI crosses below 30 (oversold) and sells when RSI crosses above 70 (overbought). A volatility filter is applied to avoid entering during high vol periods.
 * When it does NOT work: This strategy does not work well during strong trending markets where price can stay in overbought/oversold conditions for extended periods without reverting. It also struggles with sudden news-driven moves and low-volatility environments where RSI becomes unreliable.
 */

function onUpdate(ctx) {
    // === INDICATORS ===
    const rsi = ctx.rsi(14, 0); // Current RSI
    const rsiPrev = ctx.rsi(14, 1); // Previous RSI  
    if (rsi == null || rsiPrev == null) return null;
    
    // === VOLATILITY FILTER ===
    const avgVol = ctx.avgVol(20);
    const vol = ctx.vol;
    if (avgVol == null || vol == null) return null;
    
    // Volatility threshold: if current volume is less than 50% of average volume, do not trade
    if (vol < avgVol * 0.5) return null;

    // === ENTRY AND EXIT CONDITIONS ===
    let orders = [];

    // Buy condition: RSI crosses below 30 (oversold)
    if (rsiPrev <= 30 && rsi > 30 && ctx.position === 0) {
        orders.push({
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.95 // Use 95% of cash to allow for fees  
        });
    } else if (rsiPrev >= 70 && rsi < 70 && ctx.position > 0) {
        // Sell condition: RSI crosses above 70 (overbought)
        orders.push({
            side: 'sell',
            qty: ctx.position
        });
    }

    return orders.length > 0 ? orders : null;
}
