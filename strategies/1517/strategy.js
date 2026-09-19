/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * Classic RSI mean reversion. Buys when RSI drops below 30 (oversold),
 * sells when RSI rises above 70 (overbought) or price drops 5% (stop-loss).
 * Works in ranging markets; loses in strong one-directional trends where
 * RSI stays extended for long periods.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const rsiPrev = ctx.rsi(14, 1);
    if (rsiPrev == null) return null;

    // No position — look for buy signal
    if (ctx.position === 0) {
        // RSI crosses below 30 → BUY (was above 30, now below)
        if (rsiPrev >= 30 && rsi < 30) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Have position — sell on RSI overbought OR stop-loss at 5%
        const rsiOverbought = rsiPrev <= 70 && rsi > 70;  // RSI crosses above 70
        const stopLoss = ctx.price <= ctx.entryPx * 0.95;  // 5% stop-loss
        if (rsiOverbought || stopLoss) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
