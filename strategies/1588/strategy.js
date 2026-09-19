/*
 * @coinsori-strategy v1
 * name: BB-ATR Mean Reversion
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 10000
 *
 * Fades Bollinger Band extremes — buys when price drops to the lower band
 * (oversold), sells when price reaches the middle SMA(20) band (mean).
 * A 2×ATR stop-loss protects from extended moves against the position.
 * Position size is 30% of cash per trade.
 * Fails in strong sustained downtrends — price stays at the lower band
 * and never mean-reverts.
 */

function onUpdate(ctx) {
    const bb   = ctx.bb(20, 2);
    const atr  = ctx.atr(14);

    if (bb == null || atr == null) return null;

    const upper  = bb.upper;
    const middle = bb.middle;  // SMA(20)
    const lower  = bb.lower;
    const price  = ctx.price;

    // === CLOSE LONG: price mean-reverted to middle band ===
    if (ctx.position > 0 && price >= middle) {
        return { side: 'sell', qty: ctx.position };
    }

    // === STOP-LOSS: price extended beyond 2×ATR from entry ===
    if (ctx.position > 0) {
        const stopPx = ctx.entryPx - 2 * atr;
        if (price < stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // === ENTER LONG: price at lower BB band (oversold) ===
    if (ctx.position === 0 && price <= lower) {
        const qty = (ctx.cash * 0.30) / price;
        return { side: 'buy', qty: qty };
    }

    return null;
}
