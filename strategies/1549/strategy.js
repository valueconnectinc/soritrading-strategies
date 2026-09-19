/*
 * @coinsori-strategy v1
 * name: ATR Volatility Contraction Breakout
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Volatility regime strategy: enters when volatility contracts to a historical
 * low (ATR below 60% of its 100-bar max), betting that a large move follows.
 * EMA(20) confirms direction — only enter in the direction of the trend.
 * Stop at 2×ATR (risk 2% of cash), target at 4×ATR (4R reward).
 * Works best on assets with periodic volatility explosions (LINK, DeFi tokens).
 * When it does NOT work: in persistently low-volatility assets or when
 * contractions resolve sideways instead of breaking out.
 */
function onUpdate(ctx) {
    const pos   = ctx.position;
    const price = ctx.price;

    // ── Indicator warm-up ───────────────────────────────────────────────
    const ema   = ctx.ema(20);
    const atr   = ctx.atr(14);
    if (ema == null || atr == null) return null;

    // ── Volatility contraction: ATR vs its 100-bar baseline ─────────────
    const atrPct = atr / price;

    // ATR 100 bars ago = long-run baseline; ratio < 0.60 means vol is compressed
    const atrMax = ctx.atr(14, 100);
    if (atrMax == null || atrMax === 0) return null;

    const atrRatio = atr / atrMax;   // current ATR vs long-run ATR

    // Contraction threshold: current ATR < 60% of long-run average
    const contracted = atrRatio < 0.60;

    // ── EMA trend filter ────────────────────────────────────────────────
    // Only trade long when price is above EMA (confirmed uptrend)
    const bullTrend = price > ema;

    // ── BUY: contraction + trend + minimum vol to make it worth it ──────
    if (pos === 0 && contracted && bullTrend) {
        // Require ATR to be > 0.3% of price — too quiet = no move likely
        if (atrPct < 0.003) return null;

        const stopPx  = price - 2.0 * atr;
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / (price - stopPx);
        if (qty > 0) {
            ctx.log('BUY — ATR ratio=' + (atrRatio*100).toFixed(1) + '% ATR%=' + (atrPct*100).toFixed(2) + '% price=' + price.toFixed(4));
            return { side: 'buy', qty: qty * 0.99 };
        }
    }

    // ── SELL: 4R target, 2R stop, or bearish EMA flip ──────────────────
    if (pos > 0) {
        const entryPx  = ctx.entryPx;
        const pnlPct   = (price - entryPx) / entryPx;
        const targetPx = entryPx + 4.0 * atr;   // 4R reward target
        const stopPx   = entryPx - 2.0 * atr;    // 2R hard stop

        const targetHit = price >= targetPx;
        const stopHit   = price <= stopPx;
        // Bearish EMA flip
        const bearFlip  = price < ema;

        if (targetHit || stopHit || bearFlip) {
            ctx.log('SELL — pnl=' + (pnlPct*100).toFixed(1) + '% target=' + targetHit + ' stop=' + stopHit);
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
