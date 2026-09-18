/*
 * @coinsori-strategy v1
 * name: RSI ATR Diagnostic
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * DIAGNOSTIC ONLY — no external data. Pure RSI(14) oversold entry
 * with ATR(14) trail stop and 15% hard stop.
 * Used to verify the core logic fires trades before adding regime filters.
 */

function onUpdate(ctx) {
    const rsi  = ctx.rsi(14, 0);
    const atr  = ctx.atr(14, 0);
    if (rsi == null || atr == null) return null;

    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    // Entry: RSI crosses INTO oversold (from above 30 to ≤ 30)
    const rsiCrossDown = rsi1 > 30 && rsi <= 30;

    if (ctx.position === 0) {
        if (rsiCrossDown) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
        }
        return null;
    }

    if (ctx.position > 0) {
        // Exit 1: RSI crosses above 60
        const rsiCrossUp = rsi1 < 60 && rsi >= 60;
        if (rsiCrossUp) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 2: ATR trail stop
        const trailStop = ctx.price < (ctx.entryPx - 2 * atr);
        if (trailStop) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 3: Hard 15% stop
        const ret = (ctx.price - ctx.entryPx) / ctx.entryPx;
        if (ret < -0.15) {
            return { side: 'sell', qty: ctx.position };
        }

        return null;
    }

    return null;
}
