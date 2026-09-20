/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion v2
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 1000
 *
 * Mean reversion on Bollinger Bands — buys when price is at or below the lower band
 * with RSI confirming oversold. Sells when price reaches the middle band or RSI
 * turns overbought. Relaxed from v1 to actually fire on XRP's 4h charts.
 * Does not work in strong trending moves where price hugs the outer band for extended periods.
 */

function onUpdate(ctx) {
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const rsi = ctx.rsi(14);
    const rsi_1 = ctx.rsi(14, 1);
    if (rsi == null || rsi_1 == null) return null;

    const lower = bb.lower;
    const mid   = bb.mid;
    const upper = bb.upper;

    // BUY: price at or below lower band AND RSI < 35 (oversold)
    const atLowerBand = ctx.price <= lower;
    const rsiOversold = rsi < 35;

    if (atLowerBand && rsiOversold && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL: price at or above middle band OR RSI > 65 (overbought)
    const atMidBand = ctx.price >= mid;
    const rsiOverbought = rsi > 65 && rsi_1 <= 65;  // RSI crosses above 65

    if ((atMidBand || rsiOverbought) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
