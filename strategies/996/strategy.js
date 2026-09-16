/*
 * @coinsori-strategy v1
 * name: Improved Bollinger Band Strategy with Multi-Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines multiple filters (BB, MACD, RSI) to improve entry accuracy and reduce false signals. It reduces the risk of entering during volatile or unclear trends.
 * When it buys and sells: The strategy enters a long position when price crosses above the upper BB band, MACD signal line turns positive, and RSI is below 70. It exits when price crosses below the lower BB band or when RSI exceeds 30.
 * When it does NOT work: This strategy struggles during strong trending markets where BB bands do not contract properly, and when the combination of filters produces too few signals.
 */

function onUpdate(ctx) {
    // Fetch indicators
    const bb = ctx.bb(20, 2); // Bollinger Bands (20-period, 2 std dev)
    const macd = ctx.macd(12, 26, 9); // MACD (12,26,9)
    const rsi = ctx.rsi(14); // RSI (14-period)

    // Guard against null indicators
    if (bb == null || macd == null || rsi == null) return null;

    // Previous values (ago=1)
    const bb_prev = ctx.bb(20, 2, 1);
    const macd_prev = ctx.macd(12, 26, 9, 1);
    const rsi_prev = ctx.rsi(14, 1);

    // Guard against null previous values
    if (bb_prev == null || macd_prev == null || rsi_prev == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // Initialize order object
    let order = null;

    // Buy condition: price crosses above upper BB, MACD signal turns positive, RSI below 70
    if (price > bb.upper && price < bb_prev.upper && macd.macd > macd.signal && macd_prev.macd <= macd_prev.signal && rsi < 70) {
        // Only enter if not already in position
        if (position <= 0) {
            return { side: 'buy', qty: ctx.cash / price * 0.95 }; // Buy with 95% of available cash
        }
    }

    // Sell condition: price crosses below lower BB or RSI climbs above 30  
    if (price < bb.lower && price > bb_prev.lower || rsi > 30) {
        // Only exit if in a long position
        if (position > 0) {
            return { side: 'sell', qty: position };
        }
    }

    // Return null if no trade signal
    return null;
}
