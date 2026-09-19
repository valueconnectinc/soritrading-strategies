/*
 * @coinsori-strategy v1
 * name: BB-ATR Volatility Breakout
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price breaks above the upper Bollinger Band (20,2) with above-average
 * volume — catching momentum explosions. Sells when price falls back below the
 * lower BB band or trails a 2×ATR protective stop. Position size is 25% of cash.
 * Fails in choppy, low-volume markets — false breakouts erode gains.
 */

function onUpdate(ctx) {
    const bb    = ctx.bb(20, 2);
    const atr   = ctx.atr(14);
    const vol   = ctx.vol;
    const avgV  = ctx.avgVol(20);

    if (bb == null || atr == null || vol == null || avgV == null) return null;

    const upper  = bb.upper;
    const lower  = bb.lower;
    const price  = ctx.price;

    // === CLOSE LONG: price fell below lower BB or hit ATR stop ===
    if (ctx.position > 0) {
        const trailStop = ctx.entryPx - 2 * atr;  // ATR-based trailing stop
        if (price < lower || price < trailStop) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // === ENTER LONG: breakout above upper BB on high volume ===
    if (ctx.position === 0 && price > upper && vol > avgV * 1.2) {
        // Volume confirms the move — avoid false breakouts
        const qty = (ctx.cash * 0.25) / price;
        return { side: 'buy', qty: qty };
    }

    return null;
}
