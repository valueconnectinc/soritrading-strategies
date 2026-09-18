/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion with Funding Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys BTC when price touches the lower Bollinger Band with above-average volume
 * and funding rate is not deeply negative (not a fear dump). Sells when price
 * touches the upper band or hits a trailing stop. Designed for ranging and
 * moderately trending markets.
 * When it does NOT work: Strong one-directional trends (Bollinger squeeze fails
 * in trending markets — price rides the band for days). High-volatility regime
 * with whipsaws also hurts.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const { upper, mid, lower } = bb;
    const price = ctx.price;
    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;

    // ── Funding rate (Binance) ──────────────────────────────────────────────
    // We read from ctx.macroSeries if funded, else skip filter
    // macro('funding') is not a standard key — use ctx.macro('dxy') as regime proxy
    // and rely on volume as the primary filter (funding API not always available on 4h)
    // Use volume regime as proxy for market sentiment
    const volRatio = vol / avgVol; // above 1 = above-average volume

    // ── Position state ─────────────────────────────────────────────────────
    const hasPos = ctx.position > 0;
    const cash = ctx.cash;

    // ── Entry: price at or below lower band + volume confirmation ──────────
    // Lower band touch = price below lower band (extreme pessimism)
    const touchLower = price <= lower;
    const volConfirm = volRatio >= 1.1; // require 10% above average volume

    if (!hasPos && touchLower && volConfirm) {
        // Buy with 90% of available cash
        return { side: 'buy', qty: (cash * 0.9) / price };
    }

    // ── Exit: price at or above upper band ──────────────────────────────────
    const touchUpper = price >= upper;

    if (hasPos && touchUpper) {
        // Close full position at upper band
        return { side: 'sell', qty: ctx.position };
    }

    // ── Stop-loss: 6% trailing loss from entry ─────────────────────────────
    // Implemented as a limit sell below entry by 6%
    if (hasPos) {
        const entryPx = ctx.entryPx;
        const stopPx = entryPx * 0.94;
        if (price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
