/*
 * @coinsori-strategy v1
 * name: Macro Regime Filter with RSI
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: It uses macroeconomic data to filter trade entries based on market regime, combining it with RSI for momentum confirmation.
 * When it buys and sells: Buys when the macro regime suggests bullish trend and RSI is below 30; sells when RSI is above 70 or macro regime turns bearish.
 * When it does NOT work: The strategy can fail during periods of high volatility, sudden regime shifts, or when macroeconomic data lags behind price movements.
 */
function onUpdate(ctx) {
    // Read macro regime signal (e.g. from Fear & Greed Index)
    const fg = ctx.data("fear_greed");
    if (fg == null) return null;

    // RSI for momentum confirmation
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Simple regime filter: 50 is neutral, below 50 is bearish, above 50 is bullish
    const isBullish = fg > 50;

    // Buy condition: Bullish macro regime + RSI < 30 (oversold)
    if (isBullish && rsi < 30) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Sell condition: RSI > 70 (overbought) or bearish macro regime
    if (rsi > 70 || !isBullish) {
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
