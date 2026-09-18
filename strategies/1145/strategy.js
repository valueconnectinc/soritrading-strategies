/*
 * @coinsori-strategy v1
 * name: EMA Crossover Momentum with ATR Stops
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when the fast EMA (9) crosses above the slow EMA (21) with
 * above-average volume confirming the move. Exits with a trailing ATR
 * stop or when the fast EMA crosses back below the slow EMA.
 * Betting on medium-term trends lasting days to weeks.
 * When it does NOT work: Whipsaw-heavy during ranging periods (crossovers
 * fire frequently in chop). Requires a trending market to be profitable.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const fast = ctx.ema(9);   // fast EMA
    const slow = ctx.ema(21);  // slow EMA
    if (fast == null || slow == null) return null;

    const fastPrev = ctx.ema(9, 1);
    const slowPrev = ctx.ema(21, 1);
    if (fastPrev == null || slowPrev == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const price = ctx.price;
    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;

    const hasPos = ctx.position > 0;

    // ── Entry: fast EMA crosses above slow EMA + volume confirmation ────────
    // Previous bar: fast below (or at) slow. Current bar: fast above slow.
    const crossUp = fastPrev <= slowPrev && fast > slow;
    const volConfirm = vol >= avgVol * 1.0; // volume at or above average

    if (!hasPos && crossUp && volConfirm) {
        return { side: 'buy', qty: (ctx.cash * 0.9) / price };
    }

    // ── Exit: fast EMA crosses below slow EMA ───────────────────────────────
    const crossDown = fastPrev >= slowPrev && fast < slow;

    if (hasPos && crossDown) {
        return { side: 'sell', qty: ctx.position };
    }

    // ── Trailing ATR stop-loss ───────────────────────────────────────────────
    // Stop triggers if price drops more than 2× ATR below the session high
    if (hasPos) {
        const entryPx = ctx.entryPx;
        // Track a rolling high using ctx.high(1) for the last closed bar
        const recentHigh = ctx.high(1); // highest of the last closed bar
        const atrStop = recentHigh - atr * 2;
        if (price < atrStop) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
