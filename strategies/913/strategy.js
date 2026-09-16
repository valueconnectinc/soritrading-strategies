/*
 * @coinsori-strategy v1
 * name: RSI-based Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses RSI to identify overbought and oversold conditions, aiming to capture mean-reverting price movements in the market. It avoids trading during strong trends and focuses on ranging markets.
 * When it buys and sells: The strategy buys when RSI crosses above 30 (oversold) and sells when RSI crosses below 70 (overbought). It also uses price action and volume to further confirm entry and exit points.
 * When it does NOT work: This strategy may not perform well in strong trending markets where mean reversion is less likely to occur. It also may underperform during low volatility periods where RSI signals are unreliable.
 */

function onUpdate(ctx) {
    // Fetch indicators
    const rsi = ctx.rsi(14, 0);
    const rsi_prev = ctx.rsi(14, 1);
    const ema_20 = ctx.ema(20, 0);
    const ema_20_prev = ctx.ema(20, 1);
    const volume = ctx.vol;
    const volume_avg = ctx.avgVol(20);

    // Wait for indicators to be valid
    if (rsi == null || rsi_prev == null) return null;

    // Define trend filter using EMA: price must be above 20-period EMA to go long, below for short
    const inUptrend = ctx.price > ema_20;
    const inDowntrend = ctx.price < ema_20;

    // Buy condition: RSI crosses above 30 (oversold) AND price is above EMA (trend filter)
    if (rsi_prev <= 30 && rsi > 30 && inUptrend && volume > volume_avg * 1.5) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Sell condition: RSI crosses below 70 (overbought) AND price is below EMA (trend filter)
    if (rsi_prev >= 70 && rsi < 70 && inDowntrend && volume > volume_avg * 1.5) {
        return { side: 'sell', qty: ctx.position };
    }

    // No action
    return null;
}
