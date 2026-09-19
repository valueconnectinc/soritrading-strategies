/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + ATR + Gentle Trend Filter (ETHUSDT)
 * ex: binance
 * syms: ETHUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETHUSDT 4h frequently overshoots its Bollinger Band
 * lower band during brief dips, then mean-reverts. The ATR volatility filter
 * prevents entries during choppy, high-ATR periods where mean-reversion fails.
 * A gentle EMA21 trend filter (skip only when EMA21 is actively falling AND
 * price below it — a confirmed downtrend) avoids the worst countertrend trades
 * without over-filtering like the previous EMA21>price filter did.
 * When it buys and sells: Buy when price touches the BB lower band AND
 * ATR is below its 20-bar average AND NOT in a confirmed downtrend.
 * Sell when price returns to the BB middle band or hits the 3× ATR stop.
 * When it does NOT work: In sustained bear markets the band widens and
 * price stays below EMA21 — the filter correctly sits out but misses
 * any bounce opportunities. In parabolic tops the band is too wide.
 */
function onUpdate(ctx) {
    // ── WARM-UP ────────────────────────────────────────────────────────────
    const bb   = ctx.bb(20, 2);
    const atr  = ctx.atr(14);
    const ema21 = ctx.ema(21);
    if (bb == null || atr == null || ema21 == null) return null;

    // ── ATR VOLATILITY FILTER ───────────────────────────────────────────────
    let atrSum = 0, atrCount = 0;
    for (let i = 0; i < 20; i++) {
        const v = ctx.atr(14, i);
        if (v == null) break;
        atrSum += v;
        atrCount++;
    }
    if (atrCount < 10) return null;
    const atrAvg = atrSum / atrCount;
    if (atr >= atrAvg) return null;  // too volatile — skip

    // ── GENTLE TREND FILTER ─────────────────────────────────────────────────
    // Only skip entries in a CONFIRMED downtrend: EMA21 falling AND price below it.
    // This is gentler than "price > EMA21" — allows entries when price dips
    // below EMA21 during a recovery (EMA21 rising), which is the best entry point.
    const ema21_1 = ctx.ema(21, 1);
    if (ema21_1 == null) return null;
    const emaFalling = ema21 < ema21_1;
    const priceBelowEma = ctx.price < ema21;
    const inDowntrend = emaFalling && priceBelowEma;

    // ── BAND LEVELS ────────────────────────────────────────────────────────
    const lower  = bb.lower;
    const middle = bb.mid;
    const price  = ctx.price;

    // ── ENTRY: price at or piercing BB lower band ─────────────────────────
    if (ctx.position === 0 && !inDowntrend) {
        // 0.5% piercing buffer — common in crypto liquidations
        if (price <= lower * 1.005) {
            const qty = ctx.cash / price * 0.98;
            return { side: 'buy', qty: qty };
        }
    }

    // ── EXIT: price at BB middle band ───────────────────────────────────────
    if (ctx.position > 0) {
        if (price >= middle * 0.998) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── HARD STOP: 3× ATR below entry ──────────────────────────────────────
    if (ctx.position > 0 && ctx.entryPx != null) {
        const stopPx = ctx.entryPx - 3 * atr;
        if (price < stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
