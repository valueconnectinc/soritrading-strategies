/*
 * @coinsori-strategy v1
 * name: MACD Histogram Trend Continuation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when the MACD histogram (12,26,9) crosses above zero — momentum is
 * shifting bullish — confirmed by RSI(14) in the 40–70 sweet spot (building
 * momentum, not overheated). ATR-based stops protect against volatility.
 * Sells on MACD bearish cross, RSI overbought, or ATR-based hard stop/target.
 * Works best in sustained trends with clear momentum shifts.
 * Fails in choppy markets where MACD crosses repeatedly (whipsaws erode
 * capital before a real trend arrives).
 */
function onUpdate(ctx) {
    const price = ctx.price;

    // ── MACD(12,26,9) — ago=1 reads the just-closed bar ────────────────
    const macdCur  = ctx.macd(12, 26, 9, 1);
    const macdPrev = ctx.macd(12, 26, 9, 2);
    if (macdCur == null || macdPrev == null) return null;
    if (macdCur.hist == null || macdPrev.hist == null) return null;

    // ── RSI(14) ─────────────────────────────────────────────────────────
    const rsi = ctx.rsi(14, 1);
    if (rsi == null) return null;

    // ── ATR(14) for stops ───────────────────────────────────────────────
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;

    // ── Trend filter: 20 EMA above 50 EMA = long-term bias bullish ───────
    const ema20 = ctx.ema(20, 1);
    const ema50 = ctx.ema(50, 1);
    if (ema20 == null || ema50 == null) return null;
    const bullBias = ema20 > ema50;

    const position = ctx.position;

    // ── ENTRY: MACD histogram crosses above 0 + RSI confirm + bull bias ─
    if (!position) {
        const histCrossUp = macdPrev.hist <= 0 && macdCur.hist > 0;  // momentum flipping bullish
        const rsiOk       = rsi >= 40 && rsi <= 70;                   // building, not overheated

        if (histCrossUp && rsiOk && bullBias) {
            // ATR-based stop: 2.5× ATR below entry
            const stopPx = price - 2.5 * atr;
            const riskAmt = ctx.cash * 0.02;   // risk 2% of cash per trade
            const qty = riskAmt / (price - stopPx);
            if (qty > 0) {
                ctx.log('BUY hist=' + macdCur.hist.toFixed(2) + ' rsi=' + rsi.toFixed(1));
                return { side: 'buy', qty: qty * 0.99 };
            }
        }
    }

    // ── EXIT: MACD bearish cross, RSI overbought, or ATR-based stop/target ─
    if (position > 0) {
        const histCrossDn = macdPrev.hist >= 0 && macdCur.hist < 0;  // momentum flipping bearish
        const rsiHot      = rsi > 70;                                 // RSI getting extended
        const stopPx      = price - 2.5 * atr;                       // trailing-ish stop
        const tpPx        = price + 6.0 * atr;                       // 6× ATR profit target

        if (histCrossDn || rsiHot || price <= stopPx || price >= tpPx) {
            ctx.log('SELL hist=' + macdCur.hist.toFixed(2) + ' rsi=' + rsi.toFixed(1));
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
