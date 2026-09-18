/*
 * @coinsori-strategy v1
 * name: Bollinger Mean Reversion
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * A mean-reversion strategy that buys when price touches the lower Bollinger
 * Band, expecting a bounce toward the middle band. Only enters when the
 * 200 EMA confirms the long-term trend is up (not catching a falling knife).
 * Sells when price reaches the middle band (mean) or hits a 2× ATR stop.
 *
 * Buys when: price touches lower BB AND price > EMA(200) AND RSI < 40.
 * Sells when: price reaches middle BB, RSI > 60, or 2× ATR stop-loss.
 *
 * When it does NOT work: Strong downtrends where price hugs the lower band
 * for extended periods. Also fails in choppy markets with no clear mean.
 */
function onUpdate(ctx) {
    const ema200 = ctx.ema(200);
    if (ema200 == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null || bb.lower == null || bb.mid == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const price = ctx.price;

    // ── ENTRY ────────────────────────────────────────────────────────────────
    if (ctx.position === 0) {
        // Price at or below lower band + long-term trend up + oversold
        const atLowerBand = price <= bb.lower;
        const trendUp = price > ema200;
        const oversold = rsi < 40;

        if (atLowerBand && trendUp && oversold) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.98,
                type: 'limit',
                price: price,
                postOnly: true,
            };
        }
    }

    // ── EXIT ─────────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: price reaches middle band — mean reversion complete
        if (price >= bb.mid) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: RSI overbought
        if (rsi > 60) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 3: ATR stop-loss (2× ATR below entry)
        const entryPx = ctx.entryPx;
        if (entryPx != null) {
            const stopPx = entryPx - 2 * atr;
            if (price < stopPx) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    return null;
}
