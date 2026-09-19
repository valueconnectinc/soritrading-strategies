/*
 * @coinsori-strategy v1
 * name: Bollinger %B Mean Reversion v2 — Relaxed ATR + Trend Guard
 * ex: binance\n * syms: LINKUSDT\n * interval: 4h\n * cash: 1000\n *
 * Why this strategy: Same mean-reversion core as 1520 but with a relaxed ATR
 * regime (wider band) and a 50-SMA trend filter to avoid fading strong downtrends.
 * When it buys and sells: Buy when %B < 0.1, RSI < 38 and rising, and price is
 * above its 50-SMA (not a downtrend). Sell at upper band or RSI > 65.
 * When it does NOT work: In strong one-directional trends — price hugs the outer
 * band and keeps going, buying the dip at progressively worse prices.
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

    // ── ATR regime — relaxed thresholds ──────────────────────────────
    const atrNow = ctx.atr(14);
    if (atrNow == null) return null;
    const atrRatio = atrNow / ctx.price;

    // Reject only extreme volatility (above 6% of price = very violent moves)
    if (atrRatio > 0.06) return null;

    // ── 50-SMA trend filter ──────────────────────────────────────────
    // Use 50-period EMA as proxy for 50-SMA (not available directly)
    const ema50 = ctx.ema(50, 0);
    if (ema50 == null) return null;
    const aboveEMA = ctx.price > ema50;

    // ── RSI divergence confirmation ──────────────────────────────────
    const rsiRising = rsiNow > rsiPrev;

    // ── Position management ──────────────────────────────────────────
    if (ctx.position === 0) {
        // BUY: price at lower band, RSI oversold and rising, not in downtrend
        if (pctBNow < 0.10 && rsiNow < 38 && rsiRising && aboveEMA) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // In position — take profit or stop
    if (pctBNow > 0.90 || rsiNow > 65) {
        return { side: 'sell', qty: ctx.position };
    }

    // Stop-loss: 1.5× ATR below entry (tighter than v1's 2.5×)
    const drawdown = ctx.entryPx - ctx.price;
    if (drawdown > 0 && drawdown > 1.5 * atrNow) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
