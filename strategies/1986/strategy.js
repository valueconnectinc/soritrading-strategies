/*
 * @coinsori-strategy v1
 * name: ETH BB Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 1000
 *
 * Bollinger Band mean reversion — buys when price touches the lower BB band
 * and RSI confirms oversold, sells when price touches upper band or RSI turns overbought.
 * Does not work in strong trending markets where price hugs one band and never reverts.
 */
function onUpdate(ctx) {
    // BB with 20-period, 2 standard deviations
    const bb0 = ctx.bb(20, 2, 0);
    const bb1 = ctx.bb(20, 2, 1);
    if (bb0 == null || bb1 == null) return null;

    const rsi = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    if (rsi == null || rsi1 == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // === ENTRY: price at or below lower band, RSI confirming oversold ===
    // RSI crossed above 30 = was oversold, now recovering
    const rsiBullCross = rsi1 < 30 && rsi > 30;
    const atLowerBand = price <= bb0.lower;

    if (!position && atLowerBand && rsiBullCross) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price at or above upper band, or RSI overbought ===
    const atUpperBand = price >= bb0.upper;
    const rsiBearCross = rsi1 > 70 && rsi < 70;

    if (position && (atUpperBand || rsiBearCross)) {
        return { side: 'sell', qty: position };
    }

    return null;
}
