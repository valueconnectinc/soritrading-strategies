/*
 * @coinsori-strategy v1
 * name: stochastic-reversion
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 1000
 *
 * Stochastic Oscillator mean reversion — a different indicator family from BB/RSI.
 * Stochastic %K < 20 = price is at the lower range of its recent swing (oversold).
 * Buys when %K < 20 AND RSI < 35 (double-confirmation of oversold).
 * Sells when %K > 80 (overbought) OR price reaches upper Bollinger Band.
 * Why this works: stochastic tracks price position within recent range; when both
 * stochastic and RSI agree on oversold, the bounce probability is higher.
 * When it does NOT work: in strong downtrends where price grinds lower without
 * a mean-reversion bounce — both indicators can stay oversold for extended periods.
 */
function onUpdate(ctx) {
    const stoch = ctx.stoch(14, 3);
    if (stoch == null || stoch.k == null || stoch.d == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    // Double-confirmation oversold: stochastic %K < 20 AND RSI < 35
    const stochOversold = stoch.k < 20;
    const rsiOversold   = rsi < 35;

    // === ENTRY: both indicators oversold ===
    if (stochOversold && rsiOversold && ctx.position <= 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }

    // === EXIT: stochastic overbought (%K > 80) OR price at upper BB ===
    const stochOverbought = stoch.k > 80;
    const priceAtUpper    = ctx.price >= bb.upper;
    if ((stochOverbought || priceAtUpper) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
