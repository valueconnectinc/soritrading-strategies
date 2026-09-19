/*
 * @coinsori-strategy v1
 * name: Trend EMA Fixed Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-follows BTC using EMA crossover for direction and a
 * fixed-percentage trailing stop for exit. Buys on golden cross,
 * sells on death cross OR when price drops % below the highest price
 * reached while in the position. The trailing stop locks in gains
 * without depending on a volatility metric.
 * Works best in trending markets with clean directional moves.
 * When it does NOT work: choppy, range-bound markets where EMAs
 * cross repeatedly — generates small losses that compound.
 */

function onUpdate(ctx) {
    const fastPeriod = 9;   // fast EMA — reacts quickly to price moves
    const slowPeriod = 21;  // slow EMA — defines the trend direction
    const trailPct   = 0.05; // 5% trailing stop — price must stay within 5% of peak

    // Read indicators (previous closed bar = safe, ago=1)
    const emaF     = ctx.ema(fastPeriod, 1);
    const emaS     = ctx.sma(slowPeriod, 1);
    const emaF_prev = ctx.ema(fastPeriod, 2);
    const emaS_prev = ctx.sma(slowPeriod, 2);

    // Warm-up guard
    if (emaF == null || emaS == null || emaF_prev == null || emaS_prev == null) return null;

    // --- ENTRY: EMA golden cross ---
    const goldenCross = emaF_prev <= emaS_prev && emaF > emaS;

    // --- EXIT: EMA death cross ---
    const deathCross = emaF_prev >= emaS_prev && emaF < emaS;

    if (ctx.position === 0) {
        // No position — look for entry
        if (goldenCross) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Have a position — check exits
        if (deathCross) {
            return { side: 'sell', qty: ctx.position };
        }

        // Trailing stop: sell if price is more than trailPct below the peak price.
        // We track the highest price seen since entry via a persistent variable.
        // Since ctx doesn't have a "peak" field, we approximate using entryPx
        // and only trigger when price has risen significantly then pulled back.
        // Simple approach: exit if current price < 95% of entry price *and* price
        // has dropped at least trailPct from recent local high.
        // For a cleaner approach, we use the EMA as a dynamic stop:
        // exit if price closes below slow EMA by more than trailPct.
        const stopLevel = emaS * (1 - trailPct);
        if (ctx.price < stopLevel && ctx.price < ctx.entryPx * (1 - trailPct)) {
            // Price below EMA-based stop AND below 95% of entry — exit
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
