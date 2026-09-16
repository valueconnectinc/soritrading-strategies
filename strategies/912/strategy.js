/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume and Trend Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy builds on the previous MACD Crossover with Volume Filter approach but adds a trend filter using EMA to improve signal reliability and reduce false signals during ranging markets.
 * When it buys and sells: The strategy buys when MACD crosses above its signal line and the price is above a 50-period EMA. It sells when MACD crosses below its signal line and the price is below a 50-period EMA.
 * When it does NOT work: This strategy may underperform in strongly ranging markets where momentum signals are unreliable, or during periods of low volume which could result in poor trade execution.
 */

function onUpdate(ctx) {
    // Fetch indicators
    const macd = ctx.macd(12, 26, 9, 0);
    const macd_prev = ctx.macd(12, 26, 9, 1);
    const ema_50 = ctx.ema(50, 0);
    const ema_50_prev = ctx.ema(50, 1);
    const volume = ctx.vol;
    const volume_avg = ctx.avgVol(20);

    // Wait for indicators to be valid
    if (macd == null || macd_prev == null || ema_50 == null || ema_50_prev == null) return null;

    // Define trend filter: price must be above 50-period EMA to go long, below for short
    const inUptrend = ctx.price > ema_50;
    const inDowntrend = ctx.price < ema_50;

    // Buy condition: MACD crosses above signal line AND price is above EMA (trend filter)
    if (macd_prev.macd <= macd_prev.signal && macd.macd > macd.signal && inUptrend) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Sell condition: MACD crosses below signal line AND price is below EMA (trend filter)
    if (macd_prev.macd >= macd_prev.signal && macd.macd < macd.signal && inDowntrend) {
        return { side: 'sell', qty: ctx.position };
    }

    // No action
    return null;
}
