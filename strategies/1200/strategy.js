/*
 * @coinsori-strategy v1
 * name: RSI Momentum
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Pure momentum: goes long when RSI crosses above 50 (upward momentum), exits
 * when RSI crosses below 40 (momentum weakening). No trend filter — pure momentum signal.
 * When it does NOT work: choppy markets where RSI oscillates around 50 — creates
 * whipsaws and small losses that compound via fees.
 */
function onUpdate(ctx) {
    if (ctx.i < 20) return null;

    const rsi  = ctx.rsi(14);
    const atr   = ctx.atr(14);

    if (rsi == null || atr == null) return null;

    // Previous bar RSI for crossover detection
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    const price = ctx.price;
    const noPos = ctx.position === 0;

    // ── BUY: RSI crosses ABOVE 50 — upward momentum confirmed
    if (noPos && rsi1 <= 50 && rsi > 50) {
        const stopPx = price - Math.min(atr * 2, price * 0.05);
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopLoss: stopPx
        };
    }

    // ── SELL: RSI crosses BELOW 40 — momentum weakening
    if (ctx.position > 0 && rsi1 >= 40 && rsi < 40) {
        return { side: 'sell', qty: ctx.position };
    }

    // Stop loss
    if (ctx.position > 0) {
        const stopPx = price - Math.min(atr * 2, price * 0.05);
        if (price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
