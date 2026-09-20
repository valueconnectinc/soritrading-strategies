/*
 * @coinsori-strategy v1
 * name: RSI Momentum 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: RSI crossing 50 on the daily is a clean momentum filter
 * that avoids the noise of intraday swings. The SMA-50 trend line keeps us
 * aligned with the major trend.
 * When it buys and sells: Buy when RSI(14) crosses above 50 AND price is
 * above SMA-50. Sell when RSI crosses below 50 OR price falls below SMA-50.
 * When it does NOT work: In slow extended uptrends RSI stays above 50 for
 * months — the strategy holds but gives back gains when the trend finally turns.
 */
function onUpdate(ctx) {
    const rsi   = ctx.rsi(14);
    const sma50 = ctx.sma(50);
    if (rsi == null || sma50 == null) return null;

    const rsi_1 = ctx.rsi(14, 1);
    if (rsi_1 == null) return null;

    const aboveSMA = ctx.price > sma50;

    // ENTRY: RSI crosses above 50 + uptrend confirmed
    if (ctx.position === 0 && rsi_1 < 50 && rsi >= 50 && aboveSMA) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // EXIT: RSI crosses below 50 OR price breaks SMA-50
    if (ctx.position > 0) {
        if (rsi_1 >= 50 && rsi < 50) {
            return { side: 'sell', qty: ctx.position };
        }
        if (ctx.price < sma50) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
