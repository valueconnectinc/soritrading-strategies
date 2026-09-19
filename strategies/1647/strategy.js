/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + ATR Volatility Filter (ETHUSDT)
 * ex: binance
 * syms: ETHUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETHUSDT 4h frequently overshoots its Bollinger Band lower
 * band during brief dips, then mean-reverts. The ATR volatility filter prevents
 * entries during choppy, high-ATR periods where the band is too wide and
 * mean-reversion fails. The EMA21 trend filter avoids buying during downtrends.
 * When it buys and sells: Buy when price touches the BB lower band AND ATR
 * is below its 20-bar average (calm market) AND price is above EMA21 (not a
 * downtrend). Sell when price returns to the BB middle band.
 * When it does NOT work: In sustained bear markets (2022-style) price stays
 * below EMA21 and the strategy sits out — which is correct but means missed
 * opportunities. In parabolic tops the band is too wide for clean entries.
 */
function onUpdate(ctx) {
    // ── WARM-UP ────────────────────────────────────────────────────────────
    const ema21 = ctx.ema(21);
    const bb    = ctx.bb(20, 2);
    const atr   = ctx.atr(14);
    if (ema21 == null || bb == null || atr == null) return null;

    // ── ATR VOLATILITY FILTER ──────────────────────────────────────────────
    // Compute 20-bar ATR average (sma of ATR series)
    let atrSum = 0, atrCount = 0;
    for (let i = 0; i < 20; i++) {
        const v = ctx.atr(14, i);
        if (v == null) break;
        atrSum += v;
        atrCount++;
    }
    if (atrCount < 10) return null;
    const atrAvg = atrSum / atrCount;

    // Only enter in calm markets (ATR below its recent average)
    // This prevents buying into volatile dumps where mean-reversion fails
    const isCalm = atr < atrAvg;

    // ── EMA21 TREND FILTER ─────────────────────────────────────────────────
    // Only buy when price is above EMA21 — avoids fighting downtrends
    const isAboveEma = ctx.price > ema21;

    // ── BOLLINGER BAND LEVELS ─────────────────────────────────────────────
    const lower  = bb.lower;
    const middle = bb.mid;
    const price  = ctx.price;

    // ── ENTRY: price at or piercing BB lower band ─────────────────────────
    if (ctx.position === 0 && isCalm && isAboveEma) {
        // Piercing buffer: allow 0.5% below band (common in crypto)
        if (price <= lower * 1.005) {
            const qty = ctx.cash / price * 0.98;
            return { side: 'buy', qty: qty };
        }
    }

    // ── EXIT: price at BB middle band ──────────────────────────────────────
    if (ctx.position > 0) {
        // Exit when price reaches or exceeds the middle band
        if (price >= middle * 0.998) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── HARD STOP: 3× ATR below entry ─────────────────────────────────────
    // Only apply stop-loss if we have a defined entry price
    if (ctx.position > 0 && ctx.entryPx != null) {
        const stopPx = ctx.entryPx - 3 * atr;
        if (price < stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
