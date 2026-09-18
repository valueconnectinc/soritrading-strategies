/*
 * @coinsori-strategy v1
 * name: ATR Channel Breakout — BTCUSDT 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Buys when price breaks above the 20-bar high (momentum surge confirmed by
 * volatility expansion). Sells when price falls below the 20-bar low (trend
 * broken). ATR tightens stop-loss — exits fast in choppy regimes.
 * When it does NOT work: ranging markets with frequent false breakouts;
 * also fails when Bitcoin drops in a straight line without pullbacks.
 */

function onUpdate(ctx) {
    // Need 20 bars to compute the high/low channel
    const high20 = ctx.high(20, 1);   // highest high of last 20 closed bars
    const low20  = ctx.low(20, 1);    // lowest  low  of last 20 closed bars
    const atr    = ctx.atr(14);
    if (high20 == null || low20 == null || atr == null) return null;

    if (ctx.position === 0) {
        // Entry: price breaks above the 20-bar high (confirmed breakout)
        if (ctx.price > high20) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Exit: price falls below the 20-bar low (trend broken)
        if (ctx.price < low20) {
            return { side: 'sell', qty: ctx.position };
        }
        // Hard stop: price drops 3×ATR below entry
        const entryPx = ctx.entryPx;
        if (entryPx != null && ctx.price < entryPx - 3 * atr) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
