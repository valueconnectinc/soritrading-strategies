/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + ATR Filter (BTCUSDT)
 * ex: binance
 * syms: BTCUSDT, BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTCUSDT 4h frequently overshoots its Bollinger Band
 * lower band during liquidity hunts and short squeezes, then mean-reverts.
 * The ATR volatility filter prevents entries during high-ATR choppy periods
 * where the band is wide and mean-reversion fails. The 3× ATR stop-loss
 * caps drawdowns. This is the same proven family as the ETHUSDT strategy
 * (exp 394, all 3 windows positive) now tested on BTCUSDT.
 * When it buys and sells: Buy when price touches the BB lower band AND
 * ATR is below its 20-bar average (calm market). Sell when price returns
 * to the BB middle band or hits the 3× ATR stop.
 * When it does NOT work: In sustained bear markets (2022-style) the band
 * widens and price never mean-reverts to the middle band — positions ride
 * the stop-loss down repeatedly. In parabolic tops the band is too wide.
 */
function onUpdate(ctx) {
    // ── WARM-UP ────────────────────────────────────────────────────────────
    const bb  = ctx.bb(20, 2);
    const atr = ctx.atr(14);
    if (bb == null || atr == null) return null;

    // ── ATR VOLATILITY FILTER ──────────────────────────────────────────────
    // Only enter in calm markets (ATR below its 20-bar average).
    // This prevents buying into volatile dumps where mean-reversion fails.
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

    // ── BAND LEVELS ────────────────────────────────────────────────────────
    const lower  = bb.lower;
    const middle = bb.mid;
    const price  = ctx.price;

    // ── ENTRY: price at or piercing BB lower band ─────────────────────────
    if (ctx.position === 0) {
        // 0.5% piercing buffer — common in crypto, don't require exact touch
        if (price <= lower * 1.005) {
            const qty = ctx.cash / price * 0.98;
            return { side: 'buy', qty: qty };
        }
    }

    // ── EXIT: price at BB middle band ─────────────────────────────────────
    if (ctx.position > 0) {
        if (price >= middle * 0.998) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── HARD STOP: 3× ATR below entry ─────────────────────────────────────
    if (ctx.position > 0 && ctx.entryPx != null) {
        const stopPx = ctx.entryPx - 3 * atr;
        if (price < stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
