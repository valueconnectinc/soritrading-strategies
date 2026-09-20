/*
 * @coinsori-strategy v1
 * name: Funding-Enhanced RSI/BB Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate acts as a soft directional bias — when funding is deeply negative, short-sellers are crowded and a bounce is more likely. Combined with RSI/BB mean reversion, this filters out the worst entries without hard-gating the strategy.
 * When it buys and sells: Buys when RSI < 35 AND price touches/lifts below BB lower band AND funding bias is not strongly negative (not crowded). Sells on RSI > 65 OR price reaches BB middle band.
 * When it does NOT work: In strong bull trends the strategy sits out most rallies (RSI never drops low enough) and loses to buy-and-hold. Also fails if funding data is stale or unavailable.
 */

function onUpdate(ctx) {
    // --- Indicators ---
    const rsi  = ctx.rsi(14, 1);
    const bb   = ctx.bb(20, 2, 1);
    const sma20 = ctx.sma(20, 1);
    const funding = ctx.funding; // funding rate for this perpetual

    // Warm-up guard
    if (rsi == null || bb == null || bb.mid == null || sma20 == null) return null;

    // --- Regime: only trade in chop (price below SMA20) —
    // In strong uptrends (price >> SMA20) we skip to avoid chasing
    const price = ctx.price;
    if (price > sma20 * 1.05) return null; // more than 5% above SMA20 = trending up, skip

    // --- Entry: RSI oversold + BB lower touch + funding soft filter ---
    const bbLower = bb.lower;
    const bbMid   = bb.mid;

    // Funding soft filter: skip if funding is deeply negative (crowded shorts = dangerous to fade)
    // Skip if funding < -0.001 (very negative funding) — crowd is too heavy on short side
    const skipOnExtremeNeg = funding != null && funding < -0.001;
    // Skip if funding is very positive (too many longs) — not a good mean reversion entry
    const skipOnExtremePos = funding != null && funding > 0.001;

    // Entry condition: RSI < 35 (oversold), price at/near BB lower band, not extreme funding
    const atBbLower = price <= bbLower * 1.02; // within 2% of lower band
    const longCond  = rsi < 35 && atBbLower && !skipOnExtremeNeg && !skipOnExtremePos;

    // --- Position check ---
    if (ctx.position <= 0 && longCond) {
        // Market buy — full position sizing
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // --- Exit: RSI overbought OR price at/near BB middle band ---
    if (ctx.position > 0) {
        const rsiExit = rsi > 65;
        const atBbMid = price >= bbMid * 0.98;
        if (rsiExit || atBbMid) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // --- Stop-loss: hard 5% loss from entry ---
    if (ctx.position > 0 && ctx.entryPx != null) {
        const pnlPct = (price - ctx.entryPx) / ctx.entryPx;
        if (pnlPct < -0.05) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
