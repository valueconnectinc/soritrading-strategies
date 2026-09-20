/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion + Volume Confirm — XRPUSDT 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: XRP often spikes to RSI oversold during panic sells or
 * liquidations, then mean-reverts within 1-3 days. Pure RSI reversal (strat 2113)
 * failed because every RSI dip triggered a trade. This version adds a volume filter:
 * the oversold reading must occur on above-average volume, separating real capitulation
 * (worth buying) from thin-volume RSI wobbles (not worth buying).
 * When it buys and sells: Buy when RSI14 < 25 AND volume > avgVol20 (capitulation).
 * Sell when RSI14 > 55 (mean reversion complete) or price hits 2.5× ATR above entry.
 * Skip entries entirely if ATR ratio > 0.95 (XRP is trending — mean reversion fails).
 * When it does NOT work: In slow XRP downtrends where RSI stays oversold for weeks
 * (holds a losing position too long). Also fails if XRP gaps down on bad news and
 * never mean-reverts.
 */
function onUpdate(ctx) {
    const rsi    = ctx.rsi(14);
    const atr14  = ctx.atr(14);
    const atr50  = ctx.atr(50);
    const avgVol = ctx.avgVol(20);
    const price  = ctx.price;

    if (rsi == null || atr14 == null || atr50 == null || avgVol == null) return null;

    // Skip entries during strong trends — mean reversion fails here
    const atrRatio = atr14 / atr50;
    if (atrRatio > 0.95) return null;

    const pos     = ctx.position;
    const entryPx = ctx.entryPx;
    const vol     = ctx.vol;

    // ── Entry: RSI oversold + volume confirmation ─────────────────────────────
    if (pos === 0 && rsi < 25 && vol != null && vol > avgVol) {
        const qty = Math.floor((ctx.cash * 0.10) / price);
        if (qty < 1) return null;
        return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
    }

    // ── Exit: RSI mean-reversion target ───────────────────────────────────────
    if (pos > 0 && rsi > 55) {
        return { side: 'sell', qty: pos };
    }

    // ── Secondary exit: 2.5× ATR take-profit ─────────────────────────────────
    if (pos > 0 && entryPx != null) {
        const tpPx = entryPx + atr14 * 2.5;
        if (price >= tpPx) {
            return { side: 'sell', qty: pos };
        }
        // Hard stop: 4× ATR below entry
        const stopPx = entryPx - atr14 * 4;
        if (price < stopPx) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
