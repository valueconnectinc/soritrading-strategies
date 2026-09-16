/*
 * @coinsori-strategy v1
 * name: RSI_MACD_Momentum_Strategy_Basic
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: A cleaner, simpler version focusing only on the core MACD and RSI signals without additional filters. This helps to isolate the core trading logic and avoid over-complicating the strategy.
 * When it buys and sells: The strategy goes long when MACD line crosses above signal line and RSI is below 40 (oversold). It exits when RSI rises above 60 (overbought) or MACD line crosses below signal line.
 * When it does NOT work: The strategy may fail in ranging markets where RSI oscillates between 30-70 and MACD doesn't generate clear trend signals.
 */
function onUpdate(ctx) {
    // Get price and volume data
    const price = ctx.price;

    // Calculate indicators
    const rsi = ctx.rsi(14);
    const macd = ctx.macd(12, 26, 9);
    const macd1 = ctx.macd(12, 26, 9, 1); // Previous bar's MACD values

    // Guard against null values
    if (rsi == null || macd == null || macd1 == null) return null;

    // Buy condition: MACD line crosses above signal line and RSI is below 40
    if (macd1.macd <= macd1.signal && macd.macd > macd.signal && rsi < 40) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // Sell condition: RSI above 60 or MACD line crosses below signal line
    if ((rsi > 60 || (macd1.macd >= macd1.signal && macd.macd < macd.signal)) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
