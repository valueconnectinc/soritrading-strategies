/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with EMA Trend Filter
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * RSI mean reversion with an EMA21 trend filter. Buys when RSI < 35 AND
 * price is above EMA21 (uptrend confirmation — avoids buying in downtrends).
 * Sells when RSI > 65 or 5% stop-loss.
 * When it does NOT work: in strong downtrends where RSI stays oversold for
 * extended periods; also misses early reversals before EMA confirms.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const rsiPrev = ctx.rsi(14, 1);
    if (rsiPrev == null) return null;

    const ema = ctx.ema(21);
    if (ema == null) return null;

    // No position — look for buy signal
    if (ctx.position === 0) {
        // RSI crosses below 35 AND price above EMA21 (trend is up)
        const rsiCross = rsiPrev >= 35 && rsi < 35;
        const trendUp = ctx.price > ema;
        if (rsiCross && trendUp) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Sell on RSI overbought OR stop-loss
        const rsiOverbought = rsiPrev <= 65 && rsi > 65;
        const stopLoss = ctx.price <= ctx.entryPx * 0.95;
        if (rsiOverbought || stopLoss) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
