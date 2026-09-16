/*
 * @coinsori-strategy v1
 * name: MACD RSI Hybrid Strategy
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD and RSI to identify trend reversals. It uses the MACD for momentum confirmation, and RSI for overbought/oversold conditions to reduce false signals.
 * When it buys and sells: The strategy buys when MACD crosses above Signal line and RSI is below 30 (oversold). It sells when MACD crosses below Signal line and RSI is above 70 (overbought).
 * When it does NOT work: This strategy may underperform in a strong trending market without reversal signals or in choppy markets where RSI stays in overbought/oversold zones for extended periods.
 */
function onUpdate(ctx) {
    // Get MACD values
    const macd = ctx.macd(12, 26, 9, 0);
    const macdSignal = ctx.macd(12, 26, 9, 1);

    // Get RSI
    const rsi = ctx.rsi(14, 0);

    // Ensure we have valid data (guard against nulls)
    if (!macd || !macdSignal || rsi == null) {
        return null;
    }

    // Check for buy conditions: MACD crossover and RSI oversold
    const buyCondition = macd.macd > macdSignal.macd && macdSignal.macd <= macdSignal.signal && rsi < 30;

    // Check for sell conditions: MACD crossunder and RSI overbought
    const sellCondition = macd.macd < macdSignal.macd && macdSignal.macd >= macdSignal.signal && rsi > 70;

    // Buy signal
    if (buyCondition && ctx.position === 0) {
        return {
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.99
        };
    }

    // Sell signal
    if (sellCondition && ctx.position > 0) {
        return {
            side: 'sell',
            qty: ctx.position
        };
    }

    // No action
    return null;
}
