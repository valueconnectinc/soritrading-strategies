/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 10000
 *
 * Fades RSI extremes — buys oversold, sells overbought.
 * A 50-period SMA filters out downtrends (only buy when price > SMA).
 * Works best in ranging markets; loses in prolonged one-directional moves.
 */

function onUpdate(ctx) {
    const rsi   = ctx.rsi(14);
    const price = ctx.price;
    const sma50 = ctx.sma(50);

    // warm-up guard
    if (rsi == null || sma50 == null) return null;

    // === CLOSE LONG: RSI overbought ===
    if (ctx.position > 0 && rsi > 70) {
        return { side: 'sell', qty: ctx.position };
    }

    // === ENTER LONG: RSI oversold + price above SMA (uptrend confirmation) ===
    if (ctx.position === 0 && rsi < 30 && price > sma50) {
        // Risk 2% of cash per trade
        const riskAmt = ctx.cash * 0.02;
        const qty = riskAmt / (price * 0.02); // qty = cash * fraction / price
        return { side: 'buy', qty: qty };
    }

    return null;
}
