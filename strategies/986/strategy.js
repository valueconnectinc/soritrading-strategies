/*
 * @coinsori-strategy v1
 * name: RSI_MACD_Momentum_Strategy
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines momentum indicators (MACD and RSI) with a volume filter to identify strong trend movements while avoiding low-activity periods. The RSI confirms overbought/oversold conditions, and MACD helps identify momentum shifts.
 * When it buys and sells: The strategy goes long when MACD line crosses above signal line and RSI is below 40 (oversold), and exits when RSI rises above 60 (overbought) or MACD line crosses below signal line.
 * When it does NOT work: The strategy may fail in ranging markets where RSI stays in middle zones and MACD doesn't generate clear signals, resulting in frequent whipsaws and small losses.
 */
function onUpdate(ctx) {
    // Get price and volume data
    const price = ctx.price;
    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20); // 20-period average volume for filtering

    // Calculate indicators
    const rsi = ctx.rsi(14);
    const macd = ctx.macd(12, 26, 9);
    const macd1 = ctx.macd(12, 26, 9, 1); // Previous bar's MACD values

    // Guard against null values
    if (rsi == null || macd == null || macd1 == null || avgVol == null) return null;

    // Volume filter: only trade when current volume is at least 1.5x the 20-period average
    if (vol < avgVol * 1.5) {
        // If we're already in a position, consider closing it
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

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
