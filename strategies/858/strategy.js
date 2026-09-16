/*
 * @coinsori-strategy v1
 * name: MACD Trend Following with ATR Stop Loss
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy follows the momentum using MACD crossovers and uses ATR to dynamically adjust stop-losses, aiming to capture strong trends while controlling risk.
 * When it buys and sells: It buys on MACD bullish crossover and sells on bearish crossover. It manages risk with ATR-based trailing stop loss.
 * When it does NOT work: This strategy fails in ranging markets with frequent trend reversals or during very low volatility periods where tight stops may prematurely exit positions.
 */

function onUpdate(ctx) {
    // === INDICATORS ===
    const macd = ctx.macd(12, 26, 9, 0); // Current MACD
    const macdPrev = ctx.macd(12, 26, 9, 1); // Previous MACD
    if (macd == null || macdPrev == null || macd.signal == null || macdPrev.signal == null) return null;
    
    // === ATR for stop loss ===
    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    // === ENTRY AND EXIT CONDITIONS ===
    // Check for MACD crossover to enter long position
    let orders = [];

    if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && ctx.position === 0) {
        // Buy signal: MACD line crosses above signal line
        orders.push({
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.95 // Use 95% of cash to allow for fees  
        });
    } else if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && ctx.position > 0) {
        // Sell signal: MACD line crosses below signal line
        orders.push({
            side: 'sell',
            qty: ctx.position
        });
    }

     // === ATR-Based Stop Loss Management ===
    if (ctx.position > 0) {
        const stopPrice = ctx.price - atr * 1.5; // 1.5x ATR stop loss
        if (ctx.price <= stopPrice) {
            orders.push({
                side: 'sell',
                qty: ctx.position
            });
        }
    }

    return orders.length > 0 ? orders : null;
}
