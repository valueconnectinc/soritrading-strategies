/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion v2
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 10000
 *
 * Fades RSI extremes — buys oversold, sells overbought.
 * Uses faster RSI(7) with looser 35/65 thresholds for more trades.
 * No trend filter to keep entries responsive.
 * Works best in ranging markets; loses in prolonged one-directional moves.
 */

function onUpdate(ctx) {
    const rsi   = ctx.rsi(7);
    if (rsi == null) return null;

    // === CLOSE LONG: RSI overbought ===
    if (ctx.position > 0 && rsi > 65) {
        return { side: 'sell', qty: ctx.position };
    }

    // === ENTER LONG: RSI oversold ===
    if (ctx.position === 0 && rsi < 35) {
        // Use 30% of cash per trade
        const qty = (ctx.cash * 0.30) / ctx.price;
        return { side: 'buy', qty: qty };
    }

    return null;
}
