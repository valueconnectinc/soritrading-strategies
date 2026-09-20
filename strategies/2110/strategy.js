/*
 * @coinsori-strategy v1
 * name: RSI+BB+Vol Mean Reversion — XRPUSDT 4H (Fixed Size)
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Strategy 2110 added a DXY macro filter that blocked all
 * entries in W2/W3 (XRP's 2021-2024 bull cycle had DXY > 104 most of the time).
 * The ATR-based position sizing was also too conservative for XRP's low price.
 * This revision removes DXY, uses fixed-cash position sizing (90% of cash),
 * and keeps the core signal: RSI oversold + at lower BB + volume surge.
 * When it buys and sells: Buy when RSI < 35, price ≤ lower BB(20,2), volume > 1.2× avg20.
 * Sell when RSI > 60 or price reaches middle BB. Stop at 2.5× ATR below entry.
 * When it does NOT work: In sustained XRP pumps where RSI never drops below 35
 * and the strategy sits out entirely. Also fails in sharp news-driven crashes
 * where the stop loss is hit before any bounce materializes.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────────
    const rsi  = ctx.rsi(14);
    const bb  = ctx.bb(20, 2);
    const atr = ctx.atr(14);
    const vol = ctx.vol;

    if (rsi == null || bb == null || atr == null || vol == null) return null;

    // ── Volume confirmation: current vol > 1.2× 20-bar average ─────────────────
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volSurge = vol > avgVol * 1.2;

    // ── Previous bar RSI for "fresh cross" detection ────────────────────────────
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    const price   = ctx.price;
    const pos     = ctx.position;
    const entryPx = ctx.entryPx;

    // ── Entry: Long ─────────────────────────────────────────────────────────────
    if (pos === 0) {
        const rsiFreshDrop = rsi < 35 && rsi1 >= 35;   // just crossed into oversold
        const atLowerBB    = bb.lower != null && price <= bb.lower * 1.01;

        // Primary signal: fresh RSI cross + at lower BB + volume surge
        if (rsiFreshDrop && atLowerBB && volSurge) {
            // Fixed cash: use 90% of available cash
            const qty = (ctx.cash * 0.90) / price;
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }

        // Fallback: already deeply oversold + strong volume + at BB
        if (rsi < 30 && atLowerBB && volSurge) {
            const qty = (ctx.cash * 0.90) / price;
            if (qty < 1) return null;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }
    }

    // ── Exit: Long ──────────────────────────────────────────────────────────────
    if (pos > 0) {
        const rsiNorm  = rsi > 60;
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
