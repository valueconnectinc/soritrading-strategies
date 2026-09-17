/*
 * @coinsori-strategy v1
 * name: FearGreed-Regime Momentum Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Fear & Greed index updates once per day — applying it
 * on a 4h chart left the filter stale for 6 bars at a time. On daily bars
 * F&G and price are naturally aligned. The regime filter avoids entering new
 * trades when sentiment is in extreme fear, which is where counter-trend
 * traps are most common.
 *
 * When it buys and sells: Buys when EMA(9) crosses above EMA(21) AND price
 * is above SMA(50) AND RSI > 50, BUT only when Fear & Greed > 30 (not in
 * extreme fear). Exits on EMA death cross, 3× ATR stop, or if F&G drops
 * below 25 (extreme fear = regime broken).
 *
 * When it does NOT work: F&G updates once daily, so intraday sentiment
 * shifts within the same day are invisible. Also underperforms in slow grind-
 * up markets where F&G stays below 50 for months but price grinds higher.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    // Snapshot previous bar on each new bar
    if (state.lastBarI !== ctx.i) {
        state.prevFast = state.fast;
        state.prevSlow = state.slow;
        state.prevRsi  = state.rsi;
        state.lastBarI = ctx.i;
    }

    state.fast = ctx.ema(9);
    state.slow = ctx.ema(21);
    state.rsi  = ctx.rsi(14);

    const fast     = state.fast;
    const slow     = state.slow;
    const prevFast = state.prevFast;
    const prevSlow = state.prevSlow;
    const rsi      = state.rsi;
    const prevRsi  = state.prevRsi;

    const sma50 = ctx.sma(50);
    const atr   = ctx.atr(14);
    const fg    = ctx.data('fear_greed');

    // Warm-up: EMA(50) needs ~50 bars, F&G dataset needs to be live
    if (fast == null || slow == null || prevFast == null || prevSlow == null ||
        rsi == null || prevRsi == null || sma50 == null || atr == null ||
        ctx.i < 60) return null;
    if (fg == null) return null;  // F&G dataset not yet loaded

    // ── Regime check ────────────────────────────────────────────────
    // Relaxed from 40 to 30: only block entries in extreme fear.
    // BullRegime (F&G > 50) is NOT required for entry — we only
    // require "not in extreme fear". This captures early-bull phases.
    const extremeFear = fg < 30;   // block new entries here
    const regimeBroken = fg < 25;  // exit open position here

    // ── Entry ───────────────────────────────────────────────────────
    const emaCrossUp   = prevFast <= prevSlow && fast > slow;
    const trendConfirm = ctx.price > sma50;
    const momentumOk   = rsi > 50;

    if (!ctx.position) {
        if (emaCrossUp && trendConfirm && momentumOk && !extremeFear) {
            state.entryPx = ctx.price;
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit 1: EMA death cross ──────────────────────────────────
        const emaCrossDown = prevFast >= prevSlow && fast < slow;
        if (emaCrossDown) return { side: 'sell', qty: ctx.position };

        // ── Exit 2: 3× ATR stop ─────────────────────────────────────
        const entryPx = state.entryPx || ctx.price;
        const stopPx  = entryPx - 3 * atr;
        if (ctx.price <= stopPx) return { side: 'sell', qty: ctx.position };

        // ── Exit 3: RSI weakness ────────────────────────────────────
        if (prevRsi >= 40 && rsi < 40) return { side: 'sell', qty: ctx.position };

        // ── Exit 4: Regime breaks into extreme fear ─────────────────
        // F&G dropped below 25 — sentiment regime has shifted, exit
        // before the downtrend accelerates.
        if (regimeBroken) return { side: 'sell', qty: ctx.position };
    }

    return null;
}
