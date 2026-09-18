/*
 * @coinsori-strategy v1
 * name: BB RSI EMA200 Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI drops below 40 and price touches the lower Bollinger Band while
 * EMA200 is rising (confirmed uptrend). Sells when price reaches the middle BB.
 * When it does NOT work: strong bear markets where EMA200 also falls — the strategy
 * catches falling knives and RSI keeps resetting without a bounce.
 */
function onUpdate(ctx) {
    // Warm-up: BB(20) needs 20 bars, RSI(14) needs 14, EMA200 needs 200
    if (ctx.i < 200) return null;

    const rsi  = ctx.rsi(14);
    const bb   = ctx.bb(20, 2);
    const ema200 = ctx.ema(200);
    const atr   = ctx.atr(14);

    if (rsi == null || bb == null || ema200 == null || atr == null) return null;
    if (bb.lower == null || bb.mid == null) return null;

    const price = ctx.price;
    const prevEma200 = ctx.ema(200, 1);
    if (prevEma200 == null) return null;

    const ema200Rising = prevEma200 < ema200;

    // ── BUY: RSI oversold + price at lower BB + EMA200 rising ──
    const rsiOversold = rsi < 40;
    const atLowerBB   = price <= bb.lower * 1.005; // 0.5% tolerance
    const noPosition  = ctx.position === 0;

    if (noPosition && rsiOversold && atLowerBB && ema200Rising) {
        const stopPx = price - Math.min(atr * 2, price * 0.08);
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopLoss: stopPx
        };
    }

    // ── SELL: price reached middle BB (mean reversion complete) ──
    if (ctx.position > 0) {
        if (price >= bb.mid * 0.998) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop: 2× ATR below entry
        const stopPx = price - Math.min(atr * 2, price * 0.08);
        if (price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
