/*
 * @coinsori-strategy v1
 * name: Bollinger %B Mean Reversion v3 — Relaxed Filters + Volume Confirm
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: LINKUSDT 4h is choppy; mean reversion works when price
 * reaches the lower Bollinger Band in non-crisis conditions. v2's filters were
 * too tight (4 trades total across 4 windows). This version relaxes entry
 * thresholds and adds volume confirmation to keep signal quality without
 * over-filtering.
 * When it buys and sells: Buy when %B < 0.15, RSI < 45 and rising, and volume
 * today is above its 20-bar average. Sell at %B > 0.85 or RSI > 62.
 * When it does NOT work: In sharp one-directional drops (flash crashes, forced
 * liquidations) where price rips through the lower band and keeps falling.
 */
function onUpdate(ctx) {
    // ── Bollinger Bands %B ───────────────────────────────────────────
    const bbNow  = ctx.bb(20, 2, 0);
    const bbPrev = ctx.bb(20, 2, 1);
    if (bbNow == null || bbPrev == null) return null;

    const pctBNow  = (ctx.price - bbNow.lower)  / (bbNow.upper - bbNow.lower);
    const pctBPrev = (ctx.price - bbPrev.lower) / (bbPrev.upper - bbPrev.lower);

    // ── RSI ─────────────────────────────────────────────────────────
    const rsiNow  = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiNow == null || rsiPrev == null) return null;

    // ── ATR regime — wider cap (10%) to allow more signals ──────────
    const atrNow = ctx.atr(14);
    if (atrNow == null) return null;
    const atrRatio = atrNow / ctx.price;

    // Reject only extreme volatility (above 10% = very violent moves)
    if (atrRatio > 0.10) return null;

    // ── Volume confirmation ─────────────────────────────────────────
    const avgVol = ctx.avgVol(20);
    if (avgVol == null || avgVol === 0) return null;
    const volConfirm = ctx.vol >= avgVol;

    // ── RSI rising (momentum turning) ─────────────────────────────
    const rsiRising = rsiNow > rsiPrev;

    // ── Position management ──────────────────────────────────────────
    if (ctx.position === 0) {
        // BUY: near lower band, RSI oversold and rising, volume confirms
        if (pctBNow < 0.15 && rsiNow < 45 && rsiRising && volConfirm) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // In position — take profit or stop
    if (pctBNow > 0.85 || rsiNow > 62) {
        return { side: 'sell', qty: ctx.position };
    }

    // Stop-loss: 2× ATR below entry
    const drawdown = ctx.entryPx - ctx.price;
    if (drawdown > 0 && drawdown > 2 * atrNow) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
