/*
 * @coinsori-strategy v1
 * name: BB+RSI Mean Reversion with EMA50 Trend Filter — XRPUSDT 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Strategy 2110 lost badly in W1 (+190% bench vs -51% strategy)
 * and W3 (+180% bench vs -29%) because it kept fading XRP's sharp pumps.
 * The only positive signal: W2 (bench -34% vs strategy -23%) — it beat the market
 * in the BEAR window. The fix: add an EMA(50) trend filter so the strategy SKIPS
 * counter-trend entries when XRP is in a strong uptrend. This is the exact approach
 * that worked on AVAXUSDT (strategy 1709).
 * When it buys and sells: Buy when RSI < 30, price at lower BB, AND EMA(50) is flat
 * or declining (not in strong uptrend). Sell at middle BB or RSI > 65.
 * When it does NOT work: In gradual XRP pumps where RSI never reaches 30 but the
 * EMA(50) stays flat — the strategy sits out the whole move. Also fails in sharp
 * one-day XRP dumps where the stop is hit before any bounce.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────────
    const rsi   = ctx.rsi(14);
    const bb    = ctx.bb(20, 2);
    const atr   = ctx.atr(14);
    const vol   = ctx.vol;
    const ema50 = ctx.ema(50);

    if (rsi == null || bb == null || atr == null || vol == null || ema50 == null) return null;

    // ── Volume confirmation ────────────────────────────────────────────────────
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volSurge = vol > avgVol * 1.2;

    // ── EMA(50) trend filter: skip if EMA(50) is rising strongly ───────────────
    // A rising EMA(50) means the market is in a sustained uptrend
    // Use the slope over 5 bars to detect "strong uptrend"
    const ema50_1 = ctx.ema(50, 1);
    const ema50_5 = ctx.ema(50, 5);
    if (ema50_1 == null || ema50_5 == null) return null;

    const emaSlope = (ema50 - ema50_5) / ema50_5;  // 5-bar % slope
    const strongUp = emaSlope > 0.015;              // >1.5% rise over 5 × 4h = 20h

    // ── Previous bar RSI for fresh cross detection ──────────────────────────────
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    const price   = ctx.price;
    const pos     = ctx.position;
    const entryPx = ctx.entryPx;

    // ── Entry: Long ─────────────────────────────────────────────────────────────
    if (pos === 0) {
        const rsiFreshDrop = rsi < 30 && rsi1 >= 30;  // fresh cross into oversold
        const atLowerBB    = bb.lower != null && price <= bb.lower * 1.01;

        // Only enter if NOT in strong uptrend (ema50 filter)
        if (rsiFreshDrop && atLowerBB && volSurge && !strongUp) {
            const qty = (ctx.cash * 0.90) / price;
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }

        // Fallback: deeply oversold + vol surge + at BB + not in strong uptrend
        if (rsi < 28 && atLowerBB && volSurge && !strongUp) {
            const qty = (ctx.cash * 0.90) / price;
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }
    }

    // ── Exit: Long ──────────────────────────────────────────────────────────────
    if (pos > 0) {
        const rsiNorm  = rsi > 65;
        const atMiddle = bb.middle != null && price >= bb.middle * 0.99;

        if (rsiNorm || atMiddle) {
            return { side: 'sell', qty: pos };
        }

        // Stop loss: 2.5× ATR below entry
        if (entryPx != null) {
            const stopPx = entryPx - atr * 2.5;
            if (price < stopPx) {
                return { side: 'sell', qty: pos };
            }
        }
    }

    return null;
}
