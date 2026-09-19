/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + ATR Filter (SOLUSDT)
 * ex: binance
 * syms: SOLUSDT, SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOLUSDT 4h is the most volatile major alt — sharp dips
 * below BB lower band happen frequently during liquidations, then snap back.
 * The ATR filter prevents entries during SOL's notoriously choppy high-vol
 * periods. This is the same proven BB+ATR mean-reversion family that worked
 * on ETHUSDT (exp 394: all 3 windows positive) now tested on SOLUSDT.
 * When it buys and sells: Buy when price touches the BB lower band AND
 * ATR is below its 20-bar average (calm market). Sell when price returns
 * to the BB middle band or hits the 3× ATR stop.
 * When it does NOT work: In SOL's parabolic tops the BB band is too wide
 * and price never mean-reverts cleanly. In sustained bear markets the
 * stop-loss gets hit repeatedly — SOL's high volatility makes 3× ATR a
 * large absolute stop that still causes significant drawdowns.
 */
function onUpdate(ctx) {
    // ── WARM-UP ────────────────────────────────────────────────────────────
    const bb  = ctx.bb(20, 2);
    const atr = ctx.atr(14);
    if (bb == null || atr == null) return null;

    // ── ATR VOLATILITY FILTER ───────────────────────────────────────────────
    // Only enter in calm markets (ATR below its 20-bar average).
    // Prevents buying into SOL's volatile dumps where mean-reversion fails.
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
        // 0.5% piercing buffer — SOL often pierces briefly on liquidations
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
