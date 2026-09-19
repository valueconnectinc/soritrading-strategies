/*
 * @coinsori-strategy v1
 * name: Volume Surge Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: Volume surges precede reversals — a spike 3× above average
 * means one side got exhausted (liquidated or FOMO'd). RSI then confirms whether
 * price reached an extreme. This is a different signal family than EMA or BB.
 * When it buys and sells: Buy when volume > 3× its 20-bar MA AND RSI < 35
 * (oversold after volume spike). Sell when RSI > 60 OR price returns to the
 * spike's opening range. Long-only to avoid shorting during bull phases.
 * When it does NOT work: In strong one-directional trends with sustained high
 * volume — the surge doesn't reverse, it continues. Also fails in low-liquidity
 * assets where volume data is noisy.
 */

function onUpdate(ctx) {
    const rsi  = ctx.rsi(14);
    const atr  = ctx.atr(14);
    const vol  = ctx.vol;
    const price = ctx.price;

    if (rsi == null || atr == null || vol == null) return null;

    // ── Volume surge detection ───────────────────────────────────────────────
    const avgVol = ctx.avgVol(20);  // 20-bar average volume
    if (avgVol == null) return null;

    const volRatio = vol / avgVol;   // how many times above average
    const isSurge  = volRatio > 3;  // 3× surge = one side exhausted

    // ── RSI extremes ────────────────────────────────────────────────────────
    const rsiOversold = rsi < 35;
    const rsiNeutral  = rsi > 55 && rsi < 70;  // not overheated

    // ── Position state ──────────────────────────────────────────────────────
    const pos = ctx.position;

    // ── Entry: long after volume surge + RSI oversold ───────────────────────
    if (pos === 0 && isSurge && rsiOversold) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit: RSI normalized or ATR-based stop ─────────────────────────────
    if (pos > 0) {
        // Take profit: RSI back to neutral zone
        if (rsiNeutral) {
            return { side: 'sell', qty: pos };
        }

        // Stop-loss: 2.5× ATR below entry
        const entryPx = ctx.entryPx;
        if (entryPx != null) {
            const stopPx = entryPx - 2.5 * atr;
            if (price < stopPx) {
                return { side: 'sell', qty: pos };
            }
        }
    }

    return null;
}
