/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Price touching the lower Bollinger Band on high volume signals
 * a probable bounce — the band acts as a dynamic support. This is more active than
 * RSI divergence and better suited for 4h bars where divergence signals are too rare.
 * When it buys and sells: Buy when price touches lower band AND RSI < 40 AND volume
 * is above its 20-bar average (confirmation). Sell when price reaches middle band or
 * upper band, or if RSI hits 70+.
 * When it does NOT work: Strong extended downtrends — price hugs the lower band for
 * long periods and keeps grinding lower. Also fails in low-volume chop where volume
 * confirmation gives false signals.
 */
function onUpdate(ctx) {
    // Indicators
    const bb = ctx.bb(20, 2, 0);
    const bb1 = ctx.bb(20, 2, 1);
    const rsiCur = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    const priceCur = ctx.price;
    const price1 = ctx.closes[1];

    if (bb == null || bb1 == null || rsiCur == null || rsi1 == null) return null;

    const { upper, middle, lower } = bb;
    const avgVol = ctx.avgVol(20);
    const vol = ctx.vol;

    // ── OPEN POSITION LOGIC ──────────────────────────────────────────────
    if (ctx.position === 0) {
        // BUY: price touching/popping below lower band on volume confirmation
        const touchLower = priceCur <= lower * 1.005; // within 0.5% of lower band
        const prevBelowLower = price1 < bb1.lower;     // was below previous bar
        const rsiOversold = rsiCur < 40;
        const rsiRising = rsiCur > rsi1;              // RSI turning up
        const volConfirm = avgVol != null && vol > avgVol * 1.1; // volume 10% above avg

        if (touchLower && prevBelowLower && rsiOversold && rsiRising && volConfirm) {
            return { side: 'buy', qty: ctx.cash / priceCur * 0.99 };
        }

        // FALLBACK BUY: extreme oversold without volume (catch deep dips)
        const rsiExtreme = rsiCur < 30;
        const priceDeepBelow = priceCur < lower * 0.97;
        if (priceDeepBelow && rsiExtreme && rsiRising) {
            return { side: 'buy', qty: ctx.cash / priceCur * 0.99 };
        }
    }

    // ── CLOSE POSITION LOGIC ─────────────────────────────────────────────
    if (ctx.position > 0) {
        // SELL 1: Price reached middle band
        if (priceCur >= middle) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 2: Price reached upper band
        if (priceCur >= upper) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 3: RSI overbought
        if (rsiCur > 70) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 4: RSI falling from above 60 (momentum weakening)
        const rsi2 = ctx.rsi(14, 2);
        if (rsi2 != null && rsi1 > 60 && rsiCur < rsi1) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 5: Stop loss — 8% trailing stop from entry
        const entryPx = ctx.entryPx || priceCur;
        if (priceCur < entryPx * 0.92) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
